"""Proposal lifecycle for syllabus edits."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.domains.syllabus.ai import ai_materials_to_operations
from app.domains.syllabus.operations import apply_operation
from app.domains.syllabus.queries import get_user_syllabus
from app.domains.syllabus.schemas import (
    ProposalApplyRequest,
    ProposalCreate,
    ProposalOperation,
    ProposalResponse,
)
from app.models.material import StudyMaterial
from app.models.syllabus_proposal import SyllabusProposal
from app.models.track import Track
from app.models.user import User
from app.services.roadmap import RoadmapError, generate_track_update


def _proposal_response(row: SyllabusProposal) -> ProposalResponse:
    operations = [ProposalOperation.model_validate(op) for op in (row.operations or [])]
    return ProposalResponse(
        id=row.id,
        syllabus_id=row.syllabus_id,
        source=row.source,
        status=row.status,
        instruction=row.instruction,
        summary=row.summary,
        base_version=row.base_version,
        operations=operations,
        selected_operation_ids=row.selected_operation_ids,
        applied_operation_ids=row.applied_operation_ids,
        error=row.error,
        created_at=row.created_at,
        updated_at=row.updated_at,
        applied_at=row.applied_at,
    )


def create_proposal(db: Session, user: User, syllabus_id: UUID, payload: ProposalCreate) -> ProposalResponse:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    operations = [op.model_dump(mode="json") for op in payload.operations]
    status = "READY" if operations else "DRAFT"
    row = SyllabusProposal(
        user_id=user.id,
        syllabus_id=track.id,
        source=payload.source,
        status=status,
        instruction=payload.instruction,
        summary=payload.summary,
        base_version=getattr(track, "version", 1) or 1,
        operations=operations,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _proposal_response(row)


def list_proposals(db: Session, user: User, syllabus_id: UUID) -> list[ProposalResponse]:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    rows = (
        db.query(SyllabusProposal)
        .filter(SyllabusProposal.syllabus_id == track.id, SyllabusProposal.user_id == user.id)
        .order_by(SyllabusProposal.created_at.desc())
        .all()
    )
    return [_proposal_response(row) for row in rows]


def get_proposal(db: Session, user: User, syllabus_id: UUID, proposal_id: UUID) -> ProposalResponse:
    row = _get_proposal_row(db, user, syllabus_id, proposal_id)
    return _proposal_response(row)


def _get_proposal_row(db: Session, user: User, syllabus_id: UUID, proposal_id: UUID) -> SyllabusProposal:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    row = (
        db.query(SyllabusProposal)
        .filter(
            SyllabusProposal.id == proposal_id,
            SyllabusProposal.syllabus_id == track.id,
            SyllabusProposal.user_id == user.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return row


def reject_proposal(db: Session, user: User, syllabus_id: UUID, proposal_id: UUID) -> ProposalResponse:
    row = _get_proposal_row(db, user, syllabus_id, proposal_id)
    if row.status in ("APPLIED", "REJECTED"):
        raise HTTPException(status_code=409, detail=f"Proposal already {row.status.lower()}")
    row.status = "REJECTED"
    db.commit()
    db.refresh(row)
    return _proposal_response(row)


def apply_proposal(
    db: Session,
    user: User,
    syllabus_id: UUID,
    proposal_id: UUID,
    payload: ProposalApplyRequest,
) -> ProposalResponse:
    row = _get_proposal_row(db, user, syllabus_id, proposal_id)
    track = get_user_syllabus(db, user.id, syllabus_id)
    assert track is not None

    if row.status in ("APPLIED", "REJECTED"):
        raise HTTPException(status_code=409, detail=f"Proposal already {row.status.lower()}")

    current_version = getattr(track, "version", 1) or 1
    if current_version != row.base_version and not payload.force:
        row.status = "CONFLICTED"
        db.commit()
        db.refresh(row)
        raise HTTPException(
            status_code=409,
            detail="Syllabus changed since proposal was created",
        )

    operations = [ProposalOperation.model_validate(op) for op in (row.operations or [])]
    if payload.operation_ids:
        selected = {op_id for op_id in payload.operation_ids}
        operations = [op for op in operations if op.id in selected]
    if not operations:
        raise HTTPException(status_code=400, detail="No operations selected")

    applied_ids: list[str] = []
    try:
        for operation in operations:
            apply_operation(db, user=user, track=track, operation=operation, proposal_id=row.id)
            applied_ids.append(operation.id)
        row.status = "APPLIED"
        row.applied_operation_ids = applied_ids
        row.selected_operation_ids = payload.operation_ids or [op.id for op in operations]
        row.applied_at = datetime.now(UTC)
        db.commit()
        db.refresh(row)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        row.status = "FAILED"
        row.error = str(exc)
        db.commit()
        db.refresh(row)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return _proposal_response(row)


def create_ai_proposal(
    db: Session,
    user: User,
    syllabus_id: UUID,
    instruction: str,
) -> ProposalResponse:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    materials = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id)
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .all()
    )

    try:
        result = generate_track_update(track, materials, instruction)
    except RoadmapError as exc:
        row = create_failed_proposal(
            db,
            user,
            track,
            instruction=instruction,
            error=str(exc),
        )
        return _proposal_response(row)

    operations = ai_materials_to_operations(
        track,
        result.get("materials") or [],
        materials,
    )
    if not operations:
        row = create_failed_proposal(
            db,
            user,
            track,
            instruction=instruction,
            error="AI returned no new materials to add.",
        )
        return _proposal_response(row)

    payload = ProposalCreate(
        source="AI",
        instruction=instruction,
        summary=result.get("summary") or "AI proposed syllabus changes.",
        operations=operations,
    )
    return create_proposal(db, user, syllabus_id, payload)


def create_failed_proposal(
    db: Session,
    user: User,
    track: Track,
    *,
    instruction: str,
    error: str,
    source: str = "AI",
) -> SyllabusProposal:
    row = SyllabusProposal(
        user_id=user.id,
        syllabus_id=track.id,
        source=source,
        status="FAILED",
        instruction=instruction,
        base_version=getattr(track, "version", 1) or 1,
        operations=[],
        error=error,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
