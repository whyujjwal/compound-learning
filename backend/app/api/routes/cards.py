from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.review_log import ReviewLog
from app.models.track import Track
from app.models.user import User
from app.schemas.card import CardDetailResponse, CardResponse, ReviewLogResponse, ReviewResponse, ReviewSubmit
from app.services.fsrs_service import review_card

router = APIRouter(prefix="/cards", tags=["cards"])


def _card_detail(db: Session, card: Card) -> CardDetailResponse:
    material = card.material
    track = material.track
    logs = (
        db.query(ReviewLog)
        .filter(ReviewLog.card_id == card.id)
        .order_by(ReviewLog.reviewed_at.desc())
        .limit(20)
        .all()
    )
    base = CardResponse.model_validate(card)
    return CardDetailResponse(
        **base.model_dump(),
        material_title=material.title,
        material_content=material.raw_content,
        material_url=material.external_url,
        track_id=track.id,
        track_name=track.name,
        track_color=track.color,
        review_logs=[ReviewLogResponse.model_validate(log) for log in logs],
    )


@router.get("", response_model=list[CardDetailResponse])
def list_cards(
    track_id: UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CardDetailResponse]:
    query = (
        db.query(Card)
        .join(StudyMaterial)
        .join(Track)
        .options(joinedload(Card.material).joinedload(StudyMaterial.track))
        .filter(Card.user_id == user.id)
    )
    if track_id:
        query = query.filter(StudyMaterial.track_id == track_id)
    cards = query.order_by(Card.due_at.asc()).all()
    return [_card_detail(db, card) for card in cards]


@router.get("/{card_id}", response_model=CardDetailResponse)
def get_card(
    card_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CardDetailResponse:
    card = (
        db.query(Card)
        .options(joinedload(Card.material).joinedload(StudyMaterial.track))
        .filter(Card.id == card_id, Card.user_id == user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return _card_detail(db, card)


@router.post("/{card_id}/review", response_model=ReviewResponse)
def submit_review(
    card_id: UUID,
    payload: ReviewSubmit,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReviewResponse:
    card = (
        db.query(Card)
        .options(joinedload(Card.material))
        .filter(Card.id == card_id, Card.user_id == user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    updated, _, actual_days, scheduled_days = review_card(
        db, card, user, payload.rating, payload.elapsed_time_seconds
    )
    return ReviewResponse(
        card=CardResponse.model_validate(updated),
        scheduled_interval_days=scheduled_days,
        actual_interval_days=actual_days,
    )
