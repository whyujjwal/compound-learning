"""Proactive coach insights — cached daily nudge and weekly postmortem.

These are pre-composed (no agentic tool loop): the server gathers a tight
metrics snapshot, asks the model for a short opinionated take, and caches
the result by period_key (YYYY-MM-DD for daily, YYYY-W## for weekly).
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.card import Card, CardState
from app.models.coach_insight import CoachInsight, CoachInsightKind
from app.models.material import StudyMaterial
from app.models.review_log import ReviewLog, ReviewRating
from app.models.track import Track
from app.models.user import User
from app.services.ai_service import AIDisabled
from app.services.stats_service import get_stats

logger = logging.getLogger("compound.coach.insights")


# ---------------------------------------------------------------------------
# Period keys
# ---------------------------------------------------------------------------
def _today_key(now: datetime | None = None) -> str:
    now = now or datetime.now(UTC)
    return now.date().isoformat()


def _week_key(now: datetime | None = None) -> str:
    now = now or datetime.now(UTC)
    iso = now.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


# ---------------------------------------------------------------------------
# Snapshot building
# ---------------------------------------------------------------------------
def _aware(dt: datetime) -> datetime:
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt


def _build_daily_snapshot(db: Session, user: User) -> dict[str, Any]:
    """Tight, model-friendly view of today's state."""
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    stats = get_stats(db, user)
    user_card_ids = select(Card.id).where(Card.user_id == user.id)

    reviews_yday = (
        db.query(ReviewLog)
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= yesterday_start,
            ReviewLog.reviewed_at < today_start,
        )
        .count()
    )
    lapses_yday = (
        db.query(ReviewLog)
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= yesterday_start,
            ReviewLog.reviewed_at < today_start,
            ReviewLog.rating == ReviewRating.AGAIN,
        )
        .count()
    )

    due_today_rows = (
        db.query(Card, StudyMaterial, Track)
        .join(StudyMaterial, Card.material_id == StudyMaterial.id)
        .join(Track, StudyMaterial.track_id == Track.id)
        .filter(Card.user_id == user.id, Card.due_at <= now)
        .order_by(Card.due_at.asc())
        .limit(50)
        .all()
    )

    today_topics: dict[str, int] = {}
    for _card, mat, track in due_today_rows:
        key = track.name
        today_topics[key] = today_topics.get(key, 0) + 1

    minutes_today = sum(int(m.estimated_minutes or 0) for _c, m, _t in due_today_rows)

    struggling = (
        db.query(Card, StudyMaterial)
        .join(StudyMaterial, Card.material_id == StudyMaterial.id)
        .filter(Card.user_id == user.id, Card.lapses > 0)
        .order_by(desc(Card.lapses), Card.retrievability.asc())
        .limit(3)
        .all()
    )

    track_names = [t.name for t in db.query(Track).filter(Track.user_id == user.id).all()]

    return {
        "date": now.date().isoformat(),
        "streak_days": stats.current_streak,
        "longest_streak_days": stats.longest_streak,
        "retention_pct": round(stats.retention_rate * 100, 1),
        "reviews_yesterday": reviews_yday,
        "lapses_yesterday": lapses_yday,
        "due_today_cards": len(due_today_rows),
        "due_today_minutes": minutes_today,
        "available_tracks": track_names,
        "topics_today": [
            {"track": k, "cards": v}
            for k, v in sorted(today_topics.items(), key=lambda kv: -kv[1])
        ],
        "top_struggles": [
            {
                "title": m.title,
                "lapses": c.lapses,
                "retrievability": round(c.retrievability or 0, 2),
            }
            for c, m in struggling
        ],
    }


def _build_weekly_snapshot(db: Session, user: User) -> dict[str, Any]:
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    prev_week_start = week_start - timedelta(days=7)

    stats = get_stats(db, user)
    user_card_ids = select(Card.id).where(Card.user_id == user.id)

    reviews_this_week = (
        db.query(ReviewLog)
        .filter(ReviewLog.card_id.in_(user_card_ids), ReviewLog.reviewed_at >= week_start)
        .count()
    )
    reviews_prev_week = (
        db.query(ReviewLog)
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= prev_week_start,
            ReviewLog.reviewed_at < week_start,
        )
        .count()
    )

    lapses_this_week = (
        db.query(ReviewLog)
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= week_start,
            ReviewLog.rating == ReviewRating.AGAIN,
        )
        .count()
    )

    # Daily breakdown — last 7 days
    day_counts: list[dict[str, Any]] = []
    for i in range(7):
        d_start = today_start - timedelta(days=6 - i)
        d_end = d_start + timedelta(days=1)
        count = (
            db.query(ReviewLog)
            .filter(
                ReviewLog.card_id.in_(user_card_ids),
                ReviewLog.reviewed_at >= d_start,
                ReviewLog.reviewed_at < d_end,
            )
            .count()
        )
        day_counts.append({"date": d_start.date().isoformat(), "reviews": count})

    # Per-track activity this week
    per_track = (
        db.query(Track.name, func.count(ReviewLog.id))
        .join(StudyMaterial, StudyMaterial.track_id == Track.id)
        .join(Card, Card.material_id == StudyMaterial.id)
        .join(ReviewLog, ReviewLog.card_id == Card.id)
        .filter(
            Track.user_id == user.id,
            ReviewLog.reviewed_at >= week_start,
        )
        .group_by(Track.name)
        .order_by(func.count(ReviewLog.id).desc())
        .all()
    )

    struggling = (
        db.query(Card, StudyMaterial, Track)
        .join(StudyMaterial, Card.material_id == StudyMaterial.id)
        .join(Track, StudyMaterial.track_id == Track.id)
        .filter(Card.user_id == user.id, Card.lapses > 0)
        .order_by(desc(Card.lapses), Card.retrievability.asc())
        .limit(5)
        .all()
    )

    track_names = [t.name for t in db.query(Track).filter(Track.user_id == user.id).all()]

    return {
        "week_key": _week_key(now),
        "reviews_this_week": reviews_this_week,
        "reviews_prev_week": reviews_prev_week,
        "lapses_this_week": lapses_this_week,
        "retention_pct": round(stats.retention_rate * 100, 1),
        "streak_days": stats.current_streak,
        "longest_streak_days": stats.longest_streak,
        "available_tracks": track_names,
        "by_day": day_counts,
        "by_track": [{"track": name, "reviews": count} for name, count in per_track],
        "top_struggles": [
            {
                "track": t.name,
                "title": m.title,
                "lapses": c.lapses,
                "retrievability": round(c.retrievability or 0, 2),
            }
            for c, m, t in struggling
        ],
    }


# ---------------------------------------------------------------------------
# Prompt + model call
# ---------------------------------------------------------------------------
DAILY_SYSTEM = (
    "You are Compound Coach. Generate ONE punchy sentence (max 22 words) for the learner's daily nudge, "
    "based strictly on the JSON snapshot. Surface the single most useful thing: a streak milestone, "
    "a retention drop, a heavy day ahead, or a struggling topic to be careful of. "
    "If reviews_yesterday and due_today_cards are both 0, write an inviting onboarding line instead. "
    "No fluff, no greeting, no emoji. Reference real numbers when present. "
    "Output ONLY the sentence — no preamble, no quotes."
)

WEEKLY_SYSTEM = (
    "You are Compound Coach. Write a candid weekly postmortem (140-180 words) for the learner, "
    "based strictly on the JSON snapshot. Structure: "
    "(1) what they did — reviews count vs prev week, retention, streak; "
    "(2) what worked and where attention is slipping (per-track or per-day pattern); "
    "(3) one concrete recommendation for next week tied to the data. "
    "If reviews_this_week is 0, instead write a short (60-90 word) starter plan tied to what tracks exist. "
    "Markdown allowed — bold key numbers, short bulleted lists. No greeting, no sign-off. Be specific and direct."
)


def _call_gemini(system: str, snapshot: dict[str, Any], max_tokens: int) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    payload = json.dumps(snapshot, default=str, indent=2)

    config = types.GenerateContentConfig(
        system_instruction=system,
        max_output_tokens=max_tokens,
        temperature=0.5,
    )
    response = client.models.generate_content(
        model=settings.ai_model,
        contents=[types.Content(role="user", parts=[types.Part.from_text(text=payload)])],
        config=config,
    )
    text = response.text if hasattr(response, "text") else ""
    return (text or "").strip()


def _call_anthropic(system: str, snapshot: dict[str, Any], max_tokens: int) -> str:
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.anthropic_api_key)
    payload = json.dumps(snapshot, default=str, indent=2)
    response = client.messages.create(
        model=settings.ai_model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": payload}],
    )
    return "".join(b.text for b in response.content if b.type == "text").strip()


def _call_openai(system: str, snapshot: dict[str, Any], max_tokens: int) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    payload = json.dumps(snapshot, default=str, indent=2)
    response = client.chat.completions.create(
        model=settings.ai_model,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": payload},
        ],
    )
    return (response.choices[0].message.content or "").strip()


def _generate(system: str, snapshot: dict[str, Any], max_tokens: int) -> str:
    if not settings.ai_enabled:
        raise AIDisabled("AI is not configured.")
    provider = settings.ai_provider
    if provider == "gemini":
        return _call_gemini(system, snapshot, max_tokens)
    if provider == "anthropic":
        return _call_anthropic(system, snapshot, max_tokens)
    if provider == "openai":
        return _call_openai(system, snapshot, max_tokens)
    raise AIDisabled(f"Unknown AI provider: {provider}")


# ---------------------------------------------------------------------------
# Public API — get-or-create with cache
# ---------------------------------------------------------------------------
def _get_cached(
    db: Session, user: User, kind: CoachInsightKind, period_key: str
) -> CoachInsight | None:
    return (
        db.query(CoachInsight)
        .filter(
            CoachInsight.user_id == user.id,
            CoachInsight.kind == kind,
            CoachInsight.period_key == period_key,
        )
        .first()
    )


def get_or_create_daily(db: Session, user: User, *, refresh: bool = False) -> CoachInsight:
    key = _today_key()
    cached = _get_cached(db, user, CoachInsightKind.DAILY, key)
    if cached and not refresh:
        return cached

    snapshot = _build_daily_snapshot(db, user)
    text = _generate(DAILY_SYSTEM, snapshot, max_tokens=400)

    if cached:
        cached.content = text
        cached.metrics = snapshot
        cached.provider = settings.ai_provider
        cached.model = settings.ai_model
        cached.generated_at = datetime.now(UTC)
        db.add(cached)
        db.commit()
        db.refresh(cached)
        return cached

    insight = CoachInsight(
        user_id=user.id,
        kind=CoachInsightKind.DAILY,
        period_key=key,
        content=text,
        metrics=snapshot,
        provider=settings.ai_provider,
        model=settings.ai_model,
    )
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight


def get_or_create_weekly(db: Session, user: User, *, refresh: bool = False) -> CoachInsight:
    key = _week_key()
    cached = _get_cached(db, user, CoachInsightKind.WEEKLY, key)
    if cached and not refresh:
        return cached

    snapshot = _build_weekly_snapshot(db, user)
    text = _generate(WEEKLY_SYSTEM, snapshot, max_tokens=900)

    if cached:
        cached.content = text
        cached.metrics = snapshot
        cached.provider = settings.ai_provider
        cached.model = settings.ai_model
        cached.generated_at = datetime.now(UTC)
        db.add(cached)
        db.commit()
        db.refresh(cached)
        return cached

    insight = CoachInsight(
        user_id=user.id,
        kind=CoachInsightKind.WEEKLY,
        period_key=key,
        content=text,
        metrics=snapshot,
        provider=settings.ai_provider,
        model=settings.ai_model,
    )
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight
