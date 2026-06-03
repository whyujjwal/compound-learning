"""Syllabus mutation helpers shared by manual edits and proposal apply."""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.domains.syllabus.schemas import ProposalOperation
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.syllabus_change_log import SyllabusChangeLog
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.user import User
from app.services.syllabus import full_block_label, syllabus_modules


def bump_version(track: Track) -> None:
    track.version = (getattr(track, "version", 1) or 1) + 1


def log_change(
    db: Session,
    *,
    user: User,
    track: Track,
    operation_type: str,
    before: dict | None,
    after: dict | None,
    proposal_id: UUID | None = None,
    operation_id: str | None = None,
) -> SyllabusChangeLog:
    row = SyllabusChangeLog(
        user_id=user.id,
        syllabus_id=track.id,
        proposal_id=proposal_id,
        operation_id=operation_id,
        operation_type=operation_type,
        before=before,
        after=after,
    )
    db.add(row)
    return row


def apply_operation(
    db: Session,
    *,
    user: User,
    track: Track,
    operation: ProposalOperation,
    proposal_id: UUID | None = None,
) -> dict:
    op_type = operation.type
    payload = operation.payload or {}
    target = operation.target

    if op_type == "module.add":
        title = payload.get("title")
        if not title:
            raise HTTPException(status_code=400, detail="module.add requires title")
        existing = (
            db.query(TrackModule)
            .filter(TrackModule.track_id == track.id, TrackModule.title == title)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail=f"Module '{title}' already exists")
        module = TrackModule(
            track_id=track.id,
            title=title,
            description=payload.get("description"),
            objective=payload.get("objective"),
            sequence=payload.get("sequence") or 0,
            estimated_minutes=payload.get("estimated_minutes") or 0,
            difficulty=payload.get("difficulty"),
        )
        db.add(module)
        db.flush()
        log_change(
            db,
            user=user,
            track=track,
            operation_type=op_type,
            before=None,
            after={"id": str(module.id), "title": module.title},
            proposal_id=proposal_id,
            operation_id=operation.id,
        )
        bump_version(track)
        return {"module_id": str(module.id)}

    if op_type == "material.add":
        title = payload.get("title")
        if not title:
            raise HTTPException(status_code=400, detail="material.add requires title")
        module_id = target.module_id or payload.get("module_id")
        module = None
        if module_id:
            module = (
                db.query(TrackModule)
                .filter(TrackModule.id == module_id, TrackModule.track_id == track.id)
                .first()
            )
            if not module:
                raise HTTPException(status_code=404, detail="Module not found")
        existing = (
            db.query(StudyMaterial)
            .filter(StudyMaterial.track_id == track.id, StudyMaterial.title == title)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail=f"Material '{title}' already exists")
        max_seq = (
            db.query(StudyMaterial.sequence)
            .filter(StudyMaterial.track_id == track.id)
            .order_by(StudyMaterial.sequence.desc())
            .first()
        )
        next_seq = (max_seq[0] if max_seq else 0) + 1
        material = StudyMaterial(
            track_id=track.id,
            module_id=module.id if module else None,
            title=title,
            raw_content=payload.get("brief_markdown") or payload.get("raw_content"),
            external_url=payload.get("url") or payload.get("external_url"),
            block_label=payload.get("block_label")
            or (full_block_label(track, module.title) if module else f"{track.name} · Core"),
            resource_type=payload.get("resource_type") or payload.get("type"),
            difficulty=payload.get("difficulty"),
            sequence=payload.get("sequence") or next_seq,
            estimated_minutes=payload.get("estimated_minutes", 20),
            priority_percent=payload.get("priority_percent", 50),
        )
        db.add(material)
        db.flush()
        if payload.get("create_card", True):
            db.add(Card(user_id=user.id, material_id=material.id))
        syllabus_modules(db, track)
        log_change(
            db,
            user=user,
            track=track,
            operation_type=op_type,
            before=None,
            after={"id": str(material.id), "title": material.title},
            proposal_id=proposal_id,
            operation_id=operation.id,
        )
        bump_version(track)
        return {"material_id": str(material.id)}

    if op_type == "material.remove":
        material_id = target.material_id
        if not material_id:
            raise HTTPException(status_code=400, detail="material.remove requires material_id")
        material = (
            db.query(StudyMaterial)
            .filter(StudyMaterial.id == material_id, StudyMaterial.track_id == track.id)
            .first()
        )
        if not material:
            raise HTTPException(status_code=404, detail="Material not found")
        before = {"id": str(material.id), "title": material.title}
        db.delete(material)
        log_change(
            db,
            user=user,
            track=track,
            operation_type=op_type,
            before=before,
            after=None,
            proposal_id=proposal_id,
            operation_id=operation.id,
        )
        bump_version(track)
        return {"removed": before["id"]}

    if op_type == "syllabus.update":
        before = {"name": track.name, "summary": track.syllabus_summary}
        for field in ("name", "summary", "description", "difficulty"):
            if field in payload and payload[field] is not None:
                if field == "summary":
                    track.syllabus_summary = payload[field]
                else:
                    setattr(track, field, payload[field])
        after = {"name": track.name, "summary": track.syllabus_summary}
        log_change(
            db,
            user=user,
            track=track,
            operation_type=op_type,
            before=before,
            after=after,
            proposal_id=proposal_id,
            operation_id=operation.id,
        )
        bump_version(track)
        return after

    raise HTTPException(status_code=400, detail=f"Unsupported operation type: {op_type}")
