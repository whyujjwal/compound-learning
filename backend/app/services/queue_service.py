"""Block-based daily queue with priority postponement, prerequisites, and HEFT ordering."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Iterable

from sqlalchemy.orm import Session, joinedload

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.user import User
from app.schemas.queue import BlockEntry, DailyQueueResponse, QueueItem
from app.services.mastery import (
    build_card_index,
    is_critical_priority,
    prerequisites_met,
)
from app.services.weekly_schedule import track_slugs_for_weekday

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


def _heft_sort_key(item: QueueItem, slot_idx: int, total_slots: int) -> float:
    """Morning blocks: high cognitive cost first. Evening blocks: low cost first."""
    midpoint = (total_slots - 1) / 2
    if slot_idx <= midpoint:
        return -item.cognitive_cost
    return item.cognitive_cost


def _sort_block_items(items: list[QueueItem], slot_idx: int, total_slots: int) -> list[QueueItem]:
    reviews = [i for i in items if i.kind == "review"]
    new_items = [i for i in items if i.kind == "new"]
    reviews.sort(key=lambda i: i.due_at)
    new_items.sort(
        key=lambda i: (
            i.priority_percent,
            i.sequence,
        )
    )
    ordered = reviews + new_items
    return sorted(ordered, key=lambda i: _heft_sort_key(i, slot_idx, total_slots))


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


def _due_review_cards_all_tracks(
    db: Session,
    user: User,
    now: datetime,
    *,
    paused_slugs: set[str],
    exclude_ids: set,
) -> list[_Card]:
    """Cross-track review pull for Sunday review block."""
    q = (
        db.query(Card)
        .join(StudyMaterial, Card.material_id == StudyMaterial.id)
        .join(Track, StudyMaterial.track_id == Track.id)
        .options(joinedload(Card.material).joinedload(StudyMaterial.track))
        .filter(
            Card.user_id == user.id,
            Card.reps > 0,
            Card.due_at <= now,
        )
    )
    if paused_slugs:
        q = q.filter(Track.slug.notin_(list(paused_slugs)))
    rows = q.order_by(Card.due_at.asc()).limit(80).all()
    out: list[_Card] = []
    for c in rows:
        if c.id in exclude_ids:
            continue
        out.append(_Card(card=c, material=c.material, track=c.material.track))
    return out


def _eligible_new_cards(
    db: Session,
    user: User,
    track_id,
    *,
    limit: int = 80,
    exclude_ids: Iterable | None = None,
) -> list[_Card]:
    card_index = build_card_index(db, user.id, track_id)
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
        .order_by(StudyMaterial.priority_percent.asc(), StudyMaterial.sequence.asc())
    )
    if exclude_ids:
        excl = list(exclude_ids)
        if excl:
            q = q.filter(Card.id.notin_(excl))
    rows = q.limit(limit * 2).all()
    eligible: list[_Card] = []
    for c in rows:
        if prerequisites_met(db, user.id, c.material, card_by_material=card_index):
            eligible.append(_Card(card=c, material=c.material, track=c.material.track))
        if len(eligible) >= limit:
            break
    return eligible


def _pack_new_with_priority(
    cards: list[_Card],
    budget_minutes: int,
) -> tuple[list[_Card], list[_Card]]:
    """Pack new cards by priority. Critical items always included; defer lowest priority."""
    if not cards:
        return [], []

    critical = [c for c in cards if is_critical_priority(c.material.priority_percent)]
    deferrable = [c for c in cards if not is_critical_priority(c.material.priority_percent)]
    deferrable.sort(key=lambda c: c.material.priority_percent, reverse=True)

    picked: list[_Card] = []
    used = 0

    for c in critical + deferrable:
        mins = max(c.material.estimated_minutes or 20, 5)
        if not picked:
            picked.append(c)
            used += mins
            continue
        if used + mins > budget_minutes:
            continue
        picked.append(c)
        used += mins

    picked_ids = {c.card.id for c in picked}
    deferred = [c for c in cards if c.card.id not in picked_ids]
    return picked, deferred


def build_daily_queue(db: Session, user: User) -> DailyQueueResponse:
    now = datetime.now(UTC)
    block_minutes = user.daily_study_minutes or DEFAULT_BLOCK_MINUTES
    if block_minutes > 240:
        block_minutes = block_minutes // 2

    weekday = now.weekday()
    paused = set(user.paused_tracks or [])
    track_slugs = [s for s in track_slugs_for_weekday(weekday) if s not in paused]

    tracks_by_slug: dict[str, Track] = {
        t.slug: t for t in db.query(Track).filter(Track.user_id == user.id).all()
    }

    blocks: list[BlockEntry] = []
    all_items: list[QueueItem] = []
    seen_card_ids: set = set()
    total_slots = len(track_slugs)

    for idx, slug in enumerate(track_slugs):
        if slug == "review":
            reviews = _due_review_cards_all_tracks(
                db, user, now, paused_slugs=paused, exclude_ids=seen_card_ids
            )
            review_minutes = 0
            picked: list[_Card] = []
            for r in reviews:
                mins = max(r.material.estimated_minutes or 20, 5)
                if review_minutes + mins > block_minutes and picked:
                    break
                picked.append(r)
                review_minutes += mins

            review_items = [_to_item(c, kind="review", now=now) for c in picked]
            for c in picked:
                seen_card_ids.add(c.card.id)

            anchor = picked[0].track if picked else next(iter(tracks_by_slug.values()), None)
            if anchor is None:
                continue

            all_items.extend(review_items)
            blocks.append(
                BlockEntry(
                    slot=idx,
                    slot_label=_slot_label(idx, total_slots),
                    track_id=anchor.id,
                    track_slug="review",
                    track_name="Review Pass",
                    track_color="#94a3b8",
                    block_minutes=block_minutes,
                    planned_minutes=review_minutes,
                    review_count=len(review_items),
                    new_count=0,
                    reviews=review_items,
                    new_items=[],
                )
            )
            continue

        track = tracks_by_slug.get(slug)
        if track is None:
            continue

        reviews = _due_review_cards(db, user, track.id, now)
        review_minutes = sum(max(r.material.estimated_minutes or 20, 5) for r in reviews)

        remaining = max(block_minutes - review_minutes, 30)
        new_pool = _eligible_new_cards(
            db, user, track.id, limit=40, exclude_ids=seen_card_ids
        )
        new_cards, _deferred = _pack_new_with_priority(new_pool, remaining)
        new_minutes = sum(max(c.material.estimated_minutes or 20, 5) for c in new_cards)

        review_items = [_to_item(c, kind="review", now=now) for c in reviews]
        new_items = [_to_item(c, kind="new", now=now) for c in new_cards]
        block_items = _sort_block_items(review_items + new_items, idx, max(total_slots, 1))
        review_items = [i for i in block_items if i.kind == "review"]
        new_items = [i for i in block_items if i.kind == "new"]

        for c in reviews + new_cards:
            seen_card_ids.add(c.card.id)

        all_items.extend(block_items)

        blocks.append(
            BlockEntry(
                slot=idx,
                slot_label=_slot_label(idx, total_slots),
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
    track = (
        db.query(Track)
        .filter(Track.user_id == user.id, Track.slug == track_slug)
        .first()
    )
    if track is None:
        return []
    now = datetime.now(UTC)
    cards = _eligible_new_cards(
        db, user, track.id, limit=count, exclude_ids=exclude_card_ids or []
    )
    return [_to_item(c, kind="new", now=now) for c in cards[:count]]
