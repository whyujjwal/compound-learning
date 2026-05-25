"""Study session logging and material completion tracking."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.material import StudyMaterial
from app.models.material_completion import CompletionState, MaterialCompletion
from app.models.study_session import CompletionStatus, StudySession
from app.models.track import Track
from app.models.user import User
from app.schemas.session import StudySessionCreate, StudySessionUpdate
from app.services.xapi_service import emit_xapi_statement


def _get_or_create_completion(
    db: Session, user: User, material_id: UUID
) -> MaterialCompletion:
    row = (
        db.query(MaterialCompletion)
        .filter(
            MaterialCompletion.user_id == user.id,
            MaterialCompletion.material_id == material_id,
        )
        .first()
    )
    if row:
        return row
    row = MaterialCompletion(user_id=user.id, material_id=material_id)
    db.add(row)
    db.flush()
    return row


def create_session(db: Session, user: User, payload: StudySessionCreate) -> StudySession:
    material = (
        db.query(StudyMaterial)
        .join(Track)
        .filter(StudyMaterial.id == payload.material_id, Track.user_id == user.id)
        .first()
    )
    if not material:
        raise ValueError("Material not found")

    session = StudySession(
        user_id=user.id,
        material_id=payload.material_id,
        started_at=payload.started_at or datetime.now(UTC),
        ended_at=payload.ended_at,
        duration_minutes=payload.duration_minutes,
        completion_status=payload.completion_status,
        self_rating=payload.self_rating,
        notes=payload.notes,
        external_evidence_url=payload.external_evidence_url,
    )
    db.add(session)

    completion = _get_or_create_completion(db, user, payload.material_id)
    completion.session_count += 1
    if payload.duration_minutes:
        completion.total_minutes += payload.duration_minutes
    completion.last_session_at = datetime.now(UTC)
    if payload.completion_status == CompletionStatus.COMPLETED:
        completion.state = CompletionState.COMPLETED
        completion.completed_at = datetime.now(UTC)
    elif completion.state == CompletionState.NOT_STARTED:
        completion.state = CompletionState.IN_PROGRESS

    db.flush()
    emit_xapi_statement(
        db,
        user,
        verb="completed" if payload.completion_status == CompletionStatus.COMPLETED else "experienced",
        activity_id=f"material:{material.id}",
        extra={
            "material_title": material.title,
            "duration_minutes": payload.duration_minutes,
            "self_rating": payload.self_rating,
        },
    )
    return session


def update_session(
    db: Session, user: User, session_id: UUID, payload: StudySessionUpdate
) -> StudySession | None:
    session = (
        db.query(StudySession)
        .filter(StudySession.id == session_id, StudySession.user_id == user.id)
        .first()
    )
    if not session:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    if payload.completion_status == CompletionStatus.COMPLETED:
        completion = _get_or_create_completion(db, user, session.material_id)
        completion.state = CompletionState.COMPLETED
        completion.completed_at = datetime.now(UTC)
    db.flush()
    return session


def mark_material_complete(db: Session, user: User, material_id: UUID, notes: str | None = None) -> StudySession:
    return create_session(
        db,
        user,
        StudySessionCreate(
            material_id=material_id,
            completion_status=CompletionStatus.COMPLETED,
            duration_minutes=0,
            notes=notes,
        ),
    )
