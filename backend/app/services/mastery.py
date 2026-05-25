"""Shared mastery and prerequisite helpers."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial

MASTERED_RETRIEVABILITY = 0.85
MASTERED_MIN_REPS = 3
CRITICAL_PRIORITY = 10


def is_mastered(card: Card) -> bool:
    return (card.retrievability or 0) >= MASTERED_RETRIEVABILITY and card.reps >= MASTERED_MIN_REPS


def is_critical_priority(priority_percent: int) -> bool:
    return priority_percent <= CRITICAL_PRIORITY


def prerequisites_met(
    db: Session,
    user_id: UUID,
    material: StudyMaterial,
    *,
    card_by_material: dict[UUID, Card] | None = None,
) -> bool:
    if material.prerequisite_material_id is None:
        return True
    if card_by_material is not None:
        prereq_card = card_by_material.get(material.prerequisite_material_id)
    else:
        prereq_card = (
            db.query(Card)
            .filter(
                Card.user_id == user_id,
                Card.material_id == material.prerequisite_material_id,
            )
            .first()
        )
    if prereq_card is None:
        return False
    return is_mastered(prereq_card)


def build_card_index(db: Session, user_id: UUID, track_id: UUID) -> dict[UUID, Card]:
    cards = (
        db.query(Card)
        .join(StudyMaterial)
        .filter(StudyMaterial.track_id == track_id, Card.user_id == user_id)
        .all()
    )
    return {c.material_id: c for c in cards}
