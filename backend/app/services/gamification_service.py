"""Gamification engine: XP, levels, and achievements.

Design notes
------------
* XP is rating-agnostic on purpose. The *act* of reviewing is the valued behavior,
  so we never reward a particular rating — that would create an incentive to mis-grade,
  which poisons the FSRS scheduler.
* The achievement catalog lives in code (``ACHIEVEMENTS``); unlocks are persisted per
  user in ``user_achievements``. Evaluation is idempotent (insert-if-absent).
* Reads here are side-effect free. In particular, computing the streak must NOT consume
  a streak freeze (``stats_service._compute_streaks`` mutates the user as a side effect,
  so we snapshot and restore around it).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.review_log import ReviewLog, ReviewRating
from app.models.user import User
from app.models.user_achievement import UserAchievement

XP_PER_REVIEW = 10
XP_DISCOVERY_BONUS = 10  # first-ever review of a card

# Quadratic level curve: xp_for_level(L) = 50 * L * (L - 1)
# -> L1=0, L2=100, L3=300, L4=600, L5=1000 ... widening as you climb.
_LEVEL_COEFF = 50


# --------------------------------------------------------------------------- levels


def xp_for_level(level: int) -> int:
    """Cumulative XP required to *reach* ``level`` (level 1 starts at 0)."""
    level = max(1, level)
    return _LEVEL_COEFF * level * (level - 1)


def level_for_xp(xp: int) -> int:
    """Highest level fully reached at ``xp`` total."""
    if xp <= 0:
        return 1
    # Closed form, then correct for float/integer edge cases to be exact.
    guess = int((_LEVEL_COEFF + math.isqrt(_LEVEL_COEFF**2 + 4 * _LEVEL_COEFF * xp)) // (2 * _LEVEL_COEFF))
    while xp_for_level(guess + 1) <= xp:
        guess += 1
    while guess > 1 and xp_for_level(guess) > xp:
        guess -= 1
    return max(1, guess)


def level_progress(xp: int) -> tuple[int, int, int]:
    """Return ``(level, xp_into_level, xp_span_to_next_level)``."""
    level = level_for_xp(xp)
    floor_xp = xp_for_level(level)
    next_xp = xp_for_level(level + 1)
    return level, xp - floor_xp, next_xp - floor_xp


def award_review_xp(user: User, *, is_first_review: bool) -> int:
    """Add the XP for one review to ``user.xp_total`` and return the amount awarded."""
    awarded = XP_PER_REVIEW + (XP_DISCOVERY_BONUS if is_first_review else 0)
    user.xp_total = (user.xp_total or 0) + awarded
    return awarded


# --------------------------------------------------------------------- achievements


@dataclass(frozen=True)
class AchievementDef:
    slug: str
    title: str
    description: str
    icon: str
    category: str
    metric: str
    threshold: int
    requires_reviews: int = 0  # noise guard (e.g. retention only counts with enough data)


ACHIEVEMENTS: list[AchievementDef] = [
    # Volume — total reviews completed
    AchievementDef("first_review", "First Step", "Complete your first review.", "👣", "Volume", "reviews_total", 1),
    AchievementDef("reviews_10", "Getting Started", "Complete 10 reviews.", "✏️", "Volume", "reviews_total", 10),
    AchievementDef("reviews_100", "Centurion", "Complete 100 reviews.", "💯", "Volume", "reviews_total", 100),
    AchievementDef("reviews_500", "Devoted", "Complete 500 reviews.", "📚", "Volume", "reviews_total", 500),
    AchievementDef("reviews_1000", "Scholar", "Complete 1,000 reviews.", "🎓", "Volume", "reviews_total", 1000),
    # Streak — consecutive active days
    AchievementDef("streak_3", "Spark", "Reach a 3-day streak.", "⚡", "Streak", "current_streak", 3),
    AchievementDef("streak_7", "On Fire", "Reach a 7-day streak.", "🔥", "Streak", "current_streak", 7),
    AchievementDef("streak_30", "Unstoppable", "Reach a 30-day streak.", "🚀", "Streak", "current_streak", 30),
    AchievementDef("streak_100", "Eternal Flame", "Reach a 100-day streak.", "🏆", "Streak", "current_streak", 100),
    # Mastery — materials at high retrievability
    AchievementDef("mastered_1", "First Mastery", "Master your first material.", "✅", "Mastery", "materials_mastered", 1),
    AchievementDef("mastered_10", "Sharpened", "Master 10 materials.", "🗡️", "Mastery", "materials_mastered", 10),
    AchievementDef("mastered_50", "Expert", "Master 50 materials.", "🧠", "Mastery", "materials_mastered", 50),
    # Level
    AchievementDef("level_5", "Rising", "Reach level 5.", "🌱", "Level", "level", 5),
    AchievementDef("level_10", "Seasoned", "Reach level 10.", "🌳", "Level", "level", 10),
    AchievementDef("level_25", "Grandmaster", "Reach level 25.", "👑", "Level", "level", 25),
    # Consistency — distinct active days in the last 30
    AchievementDef("active_7", "Habit Formed", "Study on 7 days in a month.", "📅", "Consistency", "days_active_30d", 7),
    AchievementDef("active_20", "Relentless", "Study on 20 days in a month.", "🗓️", "Consistency", "days_active_30d", 20),
    # Retention — recall accuracy (guarded by a minimum sample)
    AchievementDef("retention_90", "Sharp Memory", "Hold 90% retention.", "🎯", "Retention", "retention_pct", 90, requires_reviews=50),
]

_BY_SLUG = {a.slug: a for a in ACHIEVEMENTS}


def satisfied_slugs(metrics: dict[str, int]) -> set[str]:
    """Which achievement slugs are satisfied by a metrics snapshot (pure)."""
    out: set[str] = set()
    for a in ACHIEVEMENTS:
        if metrics.get(a.metric, 0) < a.threshold:
            continue
        if a.requires_reviews and metrics.get("reviews_total", 0) < a.requires_reviews:
            continue
        out.add(a.slug)
    return out


def current_metrics(db: Session, user: User) -> dict[str, int]:
    """Cheap, side-effect-free snapshot of the metrics achievements read."""
    user_card_ids = select(Card.id).where(Card.user_id == user.id)

    reviews_total = db.query(ReviewLog).filter(ReviewLog.card_id.in_(user_card_ids)).count()
    materials_mastered = (
        db.query(Card)
        .filter(Card.user_id == user.id, Card.reps >= 3, Card.retrievability >= 0.85)
        .count()
    )
    successful = (
        db.query(ReviewLog)
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.rating.in_([ReviewRating.HARD, ReviewRating.GOOD, ReviewRating.EASY]),
        )
        .count()
    )
    retention_pct = round(successful / reviews_total * 100) if reviews_total else 0

    current_streak, longest_streak, days_active_30d = _streak_snapshot(db, user)

    return {
        "reviews_total": reviews_total,
        "materials_mastered": materials_mastered,
        "retention_pct": retention_pct,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "days_active_30d": days_active_30d,
        "level": level_for_xp(user.xp_total or 0),
    }


def _streak_snapshot(db: Session, user: User) -> tuple[int, int, int]:
    """Streak numbers without consuming a streak freeze (read-only)."""
    # Imported lazily to avoid a circular import (stats_service imports nothing from here).
    from app.services.stats_service import _compute_streaks
    from app.services.timezone import local_date_for, local_day_bounds, local_today

    today = local_today(None, user)
    lookback_start, _ = local_day_bounds(today - timedelta(days=400), None, user)
    month_start, _ = local_day_bounds(today - timedelta(days=29), None, user)

    user_card_ids = select(Card.id).where(Card.user_id == user.id)
    review_dates = [
        r[0]
        for r in db.query(ReviewLog.reviewed_at)
        .filter(ReviewLog.card_id.in_(user_card_ids), ReviewLog.reviewed_at >= lookback_start)
        .order_by(ReviewLog.reviewed_at.desc())
        .all()
    ]

    freeze_snapshot = user.streak_freeze_remaining
    current_streak, longest_streak = _compute_streaks(review_dates, None, user)
    user.streak_freeze_remaining = freeze_snapshot  # read must not consume a freeze

    def _aware(d):
        return d.replace(tzinfo=month_start.tzinfo) if d.tzinfo is None else d

    days_active_30d = len(
        {local_date_for(d, None, user) for d in review_dates if _aware(d) >= month_start}
    )
    return current_streak, longest_streak, days_active_30d


def evaluate_achievements(db: Session, user: User) -> list[AchievementDef]:
    """Unlock any newly-satisfied achievements and return the newly-unlocked defs."""
    metrics = current_metrics(db, user)
    satisfied = satisfied_slugs(metrics)
    if not satisfied:
        return []

    already = {
        row.slug
        for row in db.query(UserAchievement.slug)
        .filter(UserAchievement.user_id == user.id, UserAchievement.slug.in_(satisfied))
        .all()
    }
    newly = [s for s in satisfied if s not in already]
    if not newly:
        return []

    for slug in newly:
        db.add(UserAchievement(user_id=user.id, slug=slug))
    db.commit()

    # Preserve catalog order for a stable, sensible presentation.
    return [a for a in ACHIEVEMENTS if a.slug in set(newly)]


def def_to_view(a: AchievementDef, *, unlocked: bool = True) -> dict:
    """Shape an achievement definition as an AchievementView (used for fresh unlocks)."""
    return {
        "slug": a.slug,
        "title": a.title,
        "description": a.description,
        "icon": a.icon,
        "category": a.category,
        "unlocked": unlocked,
        "unlocked_at": None,
        "progress": 1.0 if unlocked else 0.0,
        "current": a.threshold,
        "threshold": a.threshold,
    }


def get_profile(db: Session, user: User) -> dict:
    """Full gamification view: level/XP plus every achievement with unlock + progress."""
    xp = user.xp_total or 0
    level, into, span = level_progress(xp)
    metrics = current_metrics(db, user)

    unlocked = {
        row.slug: row.unlocked_at
        for row in db.query(UserAchievement.slug, UserAchievement.unlocked_at)
        .filter(UserAchievement.user_id == user.id)
        .all()
    }

    achievements = []
    for a in ACHIEVEMENTS:
        value = metrics.get(a.metric, 0)
        is_unlocked = a.slug in unlocked
        progress = 1.0 if is_unlocked else min(1.0, value / a.threshold if a.threshold else 1.0)
        achievements.append(
            {
                "slug": a.slug,
                "title": a.title,
                "description": a.description,
                "icon": a.icon,
                "category": a.category,
                "unlocked": is_unlocked,
                "unlocked_at": unlocked.get(a.slug).isoformat() if is_unlocked and unlocked.get(a.slug) else None,
                "progress": round(progress, 3),
                "current": value,
                "threshold": a.threshold,
            }
        )

    return {
        "xp_total": xp,
        "level": level,
        "level_xp_into": into,
        "level_xp_span": span,
        "next_level": level + 1,
        "achievements_unlocked": len(unlocked),
        "achievements_total": len(ACHIEVEMENTS),
        "achievements": achievements,
    }
