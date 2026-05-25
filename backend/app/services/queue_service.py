"""Block-based daily queue.

The user opens the app any day. The app:
  1. Looks up the assigned tracks for today (weekly template).
  2. For each block (one per assigned track), builds an ordered list of items:
       reviews  = FSRS-due cards (reps > 0 AND due_at <= now) for that track
       new      = next-in-sequence cards (reps == 0) for that track,
                  packed until block budget filled
  3. Returns the blocks. No calendar anchoring, no "overdue", no reschedule.

If the user misses days, blocks tomorrow look identical. They pick up where
they left off because `reps == 0` is stable across time.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Iterable

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.models.card import Card, CardState
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.user import User
from app.schemas.queue import BlockEntry, DailyQueueResponse, QueueItem

# Weekly template — which tracks are studied on which day.
# Weekday integer (Mon=0 ... Sun=6) → ordered list of track slugs (one per block).
WEEKLY_BLOCK_TEMPLATE: dict[int, list[str]] = {
    0: ["dsa", "ai-math"],
    1: ["dsa", "llm-ml"],
    2: ["dsa", "system-design"],
    3: ["ai-math", "llm-ml"],
    4: ["dsa", "system-design"],
    5: ["dsa", "ai-math", "llm-ml", "system-design"],
    6: ["dsa", "ai-math", "llm-ml", "system-design"],
}

# Time-of-day labels for blocks within a single day.
_SLOT_LABELS = {
    2: ["Morning", "Afternoon"],
    3: ["Morning", "Afternoon", "Evening"],
    4: ["Morning", "Midday", "Afternoon", "Evening"],
}

DEFAULT_BLOCK_MINUTES = 120


def _slot_label(idx: int, total: int) -> str:
    labels = _SLOT_LABELS.get(total)
    if labels and idx < len(labels):
        return labels[idx]
    return f"Block {idx + 1}"


def _aware(dt: datetime) -> datetime:
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt


@dataclass
class _Card:
    card: Card
    material: StudyMaterial
    track: Track


def _to_item(c: _Card, *, kind: str, now: datetime) -> QueueItem:
    track = c.track
    material = c.material
    card = c.card
    return QueueItem(
        card_id=card.id,
        material_id=material.id,
        material_title=material.title,
        material_content=material.raw_content,
        material_url=material.external_url,
        block_label=material.block_label,
        resource_type=material.resource_type,
        sequence=material.sequence,
        track_id=track.id,
        track_slug=track.slug,
        track_name=track.name,
        track_color=track.color,
        state=card.state.value,
        due_at=card.due_at,
        priority_percent=material.priority_percent,
        estimated_minutes=material.estimated_minutes,
        cognitive_cost=material.cognitive_cost_multiplier * track.cognitive_multiplier,
        difficulty=card.difficulty,
        stability=card.stability,
        retrievability=card.retrievability,
        kind=kind,
    )


def _due_review_cards(db: Session, user: User, track_id, now: datetime) -> list[_Card]:
    """Cards that have been reviewed at least once AND are due now."""
    rows = (
        db.query(Card)
        .join(StudyMaterial, Card.material_id == StudyMaterial.id)
        .join(Track, StudyMaterial.track_id == Track.id)
        .options(joinedload(Card.material).joinedload(StudyMaterial.track))
        .filter(
            Card.user_id == user.id,
            StudyMaterial.track_id == track_id,
            Card.reps > 0,
            Card.due_at <= now,
        )
        .order_by(Card.due_at.asc())
        .all()
    )
    return [_Card(card=c, material=c.material, track=c.material.track) for c in rows]


def _next_new_cards(
    db: Session,
    user: User,
    track_id,
    *,
    limit: int = 50,
    exclude_ids: Iterable | None = None,
) -> list[_Card]:
    """Next-in-sequence cards that have never been reviewed (reps == 0)."""
    q = (
        db.query(Card)
        .join(StudyMaterial, Card.material_id == StudyMaterial.id)
        .join(Track, StudyMaterial.track_id == Track.id)
        .options(joinedload(Card.material).joinedload(StudyMaterial.track))
        .filter(
            Card.user_id == user.id,
            StudyMaterial.track_id == track_id,
            Card.reps == 0,
        )
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
    )
    if exclude_ids:
        excl = list(exclude_ids)
        if excl:
            q = q.filter(Card.id.notin_(excl))
    rows = q.limit(limit).all()
    return [_Card(card=c, material=c.material, track=c.material.track) for c in rows]


def _pack_new_into_block(cards: list[_Card], budget_minutes: int) -> list[_Card]:
    """Take new cards in order until we exceed budget. Always include at least 1."""
    picked: list[_Card] = []
    used = 0
    for c in cards:
        mins = max(c.material.estimated_minutes or 20, 5)
        if not picked:
            picked.append(c)
            used += mins
            continue
        if used + mins > budget_minutes:
            break
        picked.append(c)
        used += mins
    return picked


def build_daily_queue(db: Session, user: User) -> DailyQueueResponse:
    now = datetime.now(UTC)
    block_minutes = user.daily_study_minutes or DEFAULT_BLOCK_MINUTES
    # daily_study_minutes is for the WHOLE day historically; in the block model
    # we treat it as a per-block budget. Use the smaller of (per-block default, user value).
    if block_minutes > 240:
        block_minutes = block_minutes // 2  # legacy "daily" value -> per-block

    weekday = now.weekday()
    track_slugs = WEEKLY_BLOCK_TEMPLATE.get(weekday, [])

    # Resolve tracks once
    tracks_by_slug: dict[str, Track] = {
        t.slug: t
        for t in db.query(Track).filter(Track.user_id == user.id).all()
    }

    blocks: list[BlockEntry] = []
    all_items: list[QueueItem] = []
    seen_card_ids: set = set()

    for idx, slug in enumerate(track_slugs):
        track = tracks_by_slug.get(slug)
        if track is None:
            continue

        # Reviews always shown in full (retention is non-negotiable)
        reviews = _due_review_cards(db, user, track.id, now)
        review_minutes = sum(max(r.material.estimated_minutes or 20, 5) for r in reviews)

        # New items: fill remaining budget
        remaining = max(block_minutes - review_minutes, 30)  # always allow at least one new
        new_pool = _next_new_cards(db, user, track.id, limit=40, exclude_ids=seen_card_ids)
        new_cards = _pack_new_into_block(new_pool, remaining)
        new_minutes = sum(max(c.material.estimated_minutes or 20, 5) for c in new_cards)

        review_items = [_to_item(c, kind="review", now=now) for c in reviews]
        new_items = [_to_item(c, kind="new", now=now) for c in new_cards]

        # Mark all selected cards as seen so they don't double-pull into other blocks
        for c in reviews + new_cards:
            seen_card_ids.add(c.card.id)

        all_items.extend(review_items)
        all_items.extend(new_items)

        blocks.append(
            BlockEntry(
                slot=idx,
                slot_label=_slot_label(idx, len(track_slugs)),
                track_id=track.id,
                track_slug=track.slug,
                track_name=track.name,
                track_color=track.color,
                block_minutes=block_minutes,
                planned_minutes=review_minutes + new_minutes,
                review_count=len(review_items),
                new_count=len(new_items),
                reviews=review_items,
                new_items=new_items,
            )
        )

    return DailyQueueResponse(
        weekday=weekday,
        block_minutes=block_minutes,
        blocks=blocks,
        items=all_items,
        total_minutes=sum(b.planned_minutes for b in blocks),
        review_count=sum(b.review_count for b in blocks),
        new_count=sum(b.new_count for b in blocks),
    )


def build_extra_pull(
    db: Session,
    user: User,
    track_slug: str,
    count: int,
    *,
    exclude_card_ids: Iterable | None = None,
) -> list[QueueItem]:
    """Pull N more new-in-sequence items from a single track. Used by 'Push more'."""
    track = (
        db.query(Track)
        .filter(Track.user_id == user.id, Track.slug == track_slug)
        .first()
    )
    if track is None:
        return []
    now = datetime.now(UTC)
    cards = _next_new_cards(
        db, user, track.id, limit=count, exclude_ids=exclude_card_ids or []
    )
    return [_to_item(c, kind="new", now=now) for c in cards]
