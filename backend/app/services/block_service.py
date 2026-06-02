"""Server-side block sessions — persistent daily block progress."""

from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.block_session import BlockSession, BlockSessionStatus
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.review_log import ReviewRating
from app.models.track import Track
from app.models.user import User
from app.schemas.block import BlockSessionResponse
from app.schemas.queue import QueueItem
from app.services.queue_service import build_daily_queue
from app.services.fsrs_service import review_card
from app.services.timezone import local_today, utc_now


def _today(user: User, timezone_name: str | None = None) -> date:
    return local_today(timezone_name, user)


def _hydrate_items(db: Session, user: User, card_ids: list[str]) -> list[QueueItem]:
    if not card_ids:
        return []
    uuids = [UUID(cid) for cid in card_ids]
    cards = (
        db.query(Card)
        .options(joinedload(Card.material).joinedload(StudyMaterial.track))
        .filter(Card.id.in_(uuids), Card.user_id == user.id)
        .all()
    )
    by_id = {str(c.id): c for c in cards}
    now = utc_now()
    items: list[QueueItem] = []
    for cid in card_ids:
        card = by_id.get(cid)
        if not card:
            continue
        material = card.material
        track = material.track
        kind = "review" if card.reps > 0 else "new"
        items.append(
            QueueItem(
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
        )
    return items


def _to_response(session: BlockSession, items: list[QueueItem]) -> BlockSessionResponse:
    active: UUID | None = None
    if session.status == BlockSessionStatus.IN_PROGRESS and session.current_index < len(items):
        active = items[session.current_index].card_id
    return BlockSessionResponse(
        id=session.id,
        session_date=session.session_date,
        slot=session.slot,
        slot_label=session.slot_label,
        track_slug=session.track_slug,
        track_name=session.track_name,
        track_color=session.track_color,
        planned_minutes=session.planned_minutes,
        current_index=session.current_index,
        total_items=len(items),
        status=session.status.value,
        started_at=session.started_at,
        completed_at=session.completed_at,
        items=items,
        active_card_id=active,
    )


def _block_items_from_daily(daily, slot: int) -> tuple[list[str], object | None]:
    block = next((b for b in daily.blocks if b.slot == slot), None)
    if not block:
        return [], None
    items = block.reviews + block.new_items
    return [str(i.card_id) for i in items], block


def start_block(
    db: Session,
    user: User,
    slot: int,
    timezone_name: str | None = None,
) -> BlockSessionResponse:
    today = _today(user, timezone_name)
    existing = (
        db.query(BlockSession)
        .filter(
            BlockSession.user_id == user.id,
            BlockSession.session_date == today,
            BlockSession.slot == slot,
        )
        .first()
    )

    daily = build_daily_queue(db, user, timezone_name, local_day=today)
    card_ids, block = _block_items_from_daily(daily, slot)
    if not block or not card_ids:
        raise HTTPException(status_code=404, detail=f"No block found for slot {slot} today")

    if existing and existing.status == BlockSessionStatus.IN_PROGRESS:
        items = _hydrate_items(db, user, existing.card_ids)
        return _to_response(existing, items)

    if existing and existing.status == BlockSessionStatus.COMPLETED:
        db.delete(existing)
        db.flush()

    session = BlockSession(
        user_id=user.id,
        session_date=today,
        slot=slot,
        slot_label=block.slot_label,
        track_slug=block.track_slug,
        track_name=block.track_name,
        track_color=block.track_color,
        planned_minutes=block.planned_minutes,
        card_ids=card_ids,
        current_index=0,
        status=BlockSessionStatus.IN_PROGRESS,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    items = _hydrate_items(db, user, card_ids)
    return _to_response(session, items)


def get_block(
    db: Session,
    user: User,
    slot: int,
    timezone_name: str | None = None,
) -> BlockSessionResponse:
    today = _today(user, timezone_name)
    session = (
        db.query(BlockSession)
        .filter(
            BlockSession.user_id == user.id,
            BlockSession.session_date == today,
            BlockSession.slot == slot,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Block session not started")
    items = _hydrate_items(db, user, session.card_ids)
    return _to_response(session, items)


def submit_block_review(
    db: Session,
    user: User,
    slot: int,
    card_id: UUID,
    rating: str,
    elapsed_seconds: int,
    timezone_name: str | None = None,
) -> BlockSessionResponse:
    today = _today(user, timezone_name)
    session = (
        db.query(BlockSession)
        .filter(
            BlockSession.user_id == user.id,
            BlockSession.session_date == today,
            BlockSession.slot == slot,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Block session not started")
    if session.status == BlockSessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Block already completed")

    card_ids = session.card_ids or []
    if session.current_index >= len(card_ids):
        raise HTTPException(status_code=400, detail="Block has no active item")

    expected = card_ids[session.current_index]
    if str(card_id) != expected:
        raise HTTPException(status_code=400, detail="Card is not the active block item")

    card = (
        db.query(Card)
        .options(joinedload(Card.material))
        .filter(Card.id == card_id, Card.user_id == user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    try:
        rating_enum = ReviewRating(rating)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid rating") from exc

    review_card(db, card, user, rating_enum, elapsed_seconds)

    session.current_index += 1
    if session.current_index >= len(card_ids):
        session.status = BlockSessionStatus.COMPLETED
        session.completed_at = datetime.now(UTC)

    db.commit()
    db.refresh(session)
    items = _hydrate_items(db, user, card_ids)
    return _to_response(session, items)
