"""Batch query helpers for syllabus list responses."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule
from app.services.mastery import is_mastered


def get_user_syllabus(db: Session, user_id: UUID, syllabus_id: UUID) -> Track | None:
    return db.query(Track).filter(Track.id == syllabus_id, Track.user_id == user_id).first()


def get_user_syllabus_by_slug(db: Session, user_id: UUID, slug: str) -> Track | None:
    return db.query(Track).filter(Track.user_id == user_id, Track.slug == slug).first()


def list_user_syllabi(
    db: Session,
    user_id: UUID,
    *,
    limit: int = 100,
    offset: int = 0,
) -> list[Track]:
    return (
        db.query(Track)
        .filter(Track.user_id == user_id)
        .order_by(Track.is_system.desc(), Track.name)
        .offset(offset)
        .limit(limit)
        .all()
    )


def batch_syllabus_counts(db: Session, track_ids: list[UUID]) -> dict[UUID, dict[str, int]]:
    if not track_ids:
        return {}

    material_counts = {
        row[0]: int(row[1])
        for row in db.query(StudyMaterial.track_id, func.count(StudyMaterial.id))
        .filter(StudyMaterial.track_id.in_(track_ids))
        .group_by(StudyMaterial.track_id)
        .all()
    }
    module_counts = {
        row[0]: int(row[1])
        for row in db.query(TrackModule.track_id, func.count(TrackModule.id))
        .filter(TrackModule.track_id.in_(track_ids))
        .group_by(TrackModule.track_id)
        .all()
    }
    now = datetime.now(UTC)
    due_counts = {
        row[0]: int(row[1])
        for row in db.query(StudyMaterial.track_id, func.count(Card.id))
        .join(Card, Card.material_id == StudyMaterial.id)
        .filter(
            StudyMaterial.track_id.in_(track_ids),
            Card.reps > 0,
            Card.due_at <= now,
        )
        .group_by(StudyMaterial.track_id)
        .all()
    }

    started_counts: dict[UUID, int] = {}
    mastered_counts: dict[UUID, int] = {}
    cards = (
        db.query(StudyMaterial.track_id, Card)
        .join(Card, Card.material_id == StudyMaterial.id)
        .filter(StudyMaterial.track_id.in_(track_ids))
        .all()
    )
    for track_id, card in cards:
        if card.reps > 0:
            started_counts[track_id] = started_counts.get(track_id, 0) + 1
        if is_mastered(card):
            mastered_counts[track_id] = mastered_counts.get(track_id, 0) + 1

    out: dict[UUID, dict[str, int]] = {}
    for track_id in track_ids:
        out[track_id] = {
            "module_count": module_counts.get(track_id, 0),
            "material_count": material_counts.get(track_id, 0),
            "started_count": started_counts.get(track_id, 0),
            "mastered_count": mastered_counts.get(track_id, 0),
            "due_review_count": due_counts.get(track_id, 0),
        }
    return out
