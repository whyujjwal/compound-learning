"""Proactive coach insights — cached daily nudge and weekly postmortem.

These are pre-composed (no agentic tool loop): the server gathers a tight
metrics snapshot, asks the model for a short opinionated take, and caches
the result by period_key (YYYY-MM-DD for daily, YYYY-W## for weekly).
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.card import Card
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

    # FSRS-due reviews (reps > 0). Not "overdue" in the block model — just reviews waiting.
    due_review_rows = (
        db.query(Card, StudyMaterial, Track)
        .join(StudyMaterial, Card.material_id == StudyMaterial.id)
        .join(Track, StudyMaterial.track_id == Track.id)
        .filter(Card.user_id == user.id, Card.reps > 0, Card.due_at <= now)
        .order_by(Card.due_at.asc())
        .limit(50)
        .all()
    )

    today_topics: dict[str, int] = {}
    for _card, _mat, track in due_review_rows:
        key = track.name
        today_topics[key] = today_topics.get(key, 0) + 1

    minutes_reviews = sum(int(m.estimated_minutes or 0) for _c, m, _t in due_review_rows)

    # Per-track progress snapshot (started %, mastered %) — context for the coach
    track_progress: list[dict[str, Any]] = []
    for track in db.query(Track).filter(Track.user_id == user.id).all():
        cards = (
            db.query(Card)
            .join(StudyMaterial)
            .filter(StudyMaterial.track_id == track.id, Card.user_id == user.id)
            .all()
        )
        total = len(cards)
        if total == 0:
            continue
        started = sum(1 for c in cards if c.reps > 0)
        mastered = sum(
            1 for c in cards if c.reps >= 3 and (c.retrievability or 0) >= 0.85
        )
        track_progress.append(
            {
                "track": track.name,
                "started_pct": round(100 * started / total, 1),
                "mastered_pct": round(100 * mastered / total, 1),
                "total": total,
            }
        )

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
        "sessions_this_week": stats.sessions_this_week,
        "days_active_30d": stats.days_active_30d,
        "total_minutes_invested": stats.total_minutes_invested,
        "retention_pct": round(stats.retention_rate * 100, 1),
        "reviews_yesterday": reviews_yday,
        "lapses_yesterday": lapses_yday,
        "due_reviews": len(due_review_rows),
        "due_review_minutes": minutes_reviews,
        "available_tracks": track_names,
        "track_progress": track_progress,
        "topics_due": [
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

    track_progress: list[dict[str, Any]] = []
    for track in db.query(Track).filter(Track.user_id == user.id).all():
        cards = (
            db.query(Card)
            .join(StudyMaterial)
            .filter(StudyMaterial.track_id == track.id, Card.user_id == user.id)
            .all()
        )
        total = len(cards)
        if total == 0:
            continue
        started = sum(1 for c in cards if c.reps > 0)
        mastered = sum(
            1 for c in cards if c.reps >= 3 and (c.retrievability or 0) >= 0.85
        )
        track_progress.append(
            {
                "track": track.name,
                "started_pct": round(100 * started / total, 1),
                "mastered_pct": round(100 * mastered / total, 1),
                "total": total,
            }
        )

    track_names = [tp["track"] for tp in track_progress] or [
        t.name for t in db.query(Track).filter(Track.user_id == user.id).all()
    ]

    return {
        "week_key": _week_key(now),
        "reviews_this_week": reviews_this_week,
        "reviews_prev_week": reviews_prev_week,
        "lapses_this_week": lapses_this_week,
        "retention_pct": round(stats.retention_rate * 100, 1),
        "sessions_this_week": stats.sessions_this_week,
        "days_active_30d": stats.days_active_30d,
        "total_minutes_invested": stats.total_minutes_invested,
        "available_tracks": track_names,
        "track_progress": track_progress,
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
    "You are Compound Coach for a lifelong learner building durable mastery in DSA, AI, math, and systems. "
    "Write ONE punchy sentence (max 22 words) for their daily nudge based strictly on the JSON snapshot. "
    "Suggest the single best action TODAY: continue the next material, clear due reviews, revisit a struggling topic, "
    "or deepen a track that's clicking. No deadlines, no 'behind' framing — learning compounds forever. "
    "Be specific — name the track or topic when possible. "
    "If reviews_yesterday and due_reviews are both 0, write an inviting first-step line. "
    "Tone: calm, direct, lifelong. No greeting, no emoji, no quotes — just the sentence."
)

WEEKLY_SYSTEM = (
    "You are Compound Coach for a lifelong learner. Write a candid weekly reflection "
    "(140-180 words) based strictly on the JSON snapshot. Structure: "
    "(1) what they invested — sessions, minutes, retention; "
    "(2) where mastery is compounding (track_progress) and where to revisit (top_struggles); "
    "(3) one concrete suggestion for next week tied to a track or topic — pace is personal, no rush. "
    "If reviews_this_week is 0, write a short (60-90 word) gentle restart plan referencing available_tracks. "
    "Never mention interviews, job prep, being behind, or missed days. Markdown allowed — bold key numbers. "
    "No greeting, no sign-off."
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
