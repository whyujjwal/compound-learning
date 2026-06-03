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
from app.models.syllabus_edge import SyllabusEdge
from app.models.track_module import TrackModule
from app.models.track_section import TrackSection
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
        section_id = target.section_id or payload.get("section_id")
        section = None
        if section_id:
            section = (
                db.query(TrackSection)
                .filter(TrackSection.id == section_id)
                .first()
            )
            if not section:
                raise HTTPException(status_code=404, detail="Section not found")
            if module is None:
                module = db.query(TrackModule).filter(TrackModule.id == section.module_id).first()
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
            section_id=section.id if section else None,
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
            provider=payload.get("provider"),
            author=payload.get("author"),
            license=payload.get("license"),
            kind=payload.get("kind") or "core",
            label=payload.get("label"),
            resource_health_status=payload.get("resource_health_status") or "UNKNOWN",
            resource_quality_score=payload.get("resource_quality_score") or 0.0,
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

    if op_type == "section.add":
        module_id = target.module_id or payload.get("module_id")
        if not module_id:
            raise HTTPException(status_code=400, detail="section.add requires module_id")
        module = (
            db.query(TrackModule)
            .filter(TrackModule.id == module_id, TrackModule.track_id == track.id)
            .first()
        )
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        title = payload.get("title")
        if not title:
            raise HTTPException(status_code=400, detail="section.add requires title")
        existing = (
            db.query(TrackSection)
            .filter(TrackSection.module_id == module.id, TrackSection.title == title)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail=f"Section '{title}' already exists")
        section = TrackSection(
            module_id=module.id,
            title=title,
            objective=payload.get("objective"),
            label=payload.get("label"),
            kind=payload.get("kind") or "core",
            learning_outcomes=payload.get("learning_outcomes"),
            sequence=payload.get("sequence") or 0,
        )
        db.add(section)
        db.flush()
        log_change(
            db, user=user, track=track, operation_type=op_type, before=None,
            after={"id": str(section.id), "title": section.title, "module_id": str(module.id)},
            proposal_id=proposal_id, operation_id=operation.id,
        )
        bump_version(track)
        return {"section_id": str(section.id)}

    if op_type in ("section.update", "section.remove", "section.move"):
        section_id = target.section_id or payload.get("section_id")
        if not section_id:
            raise HTTPException(status_code=400, detail=f"{op_type} requires section_id")
        section = (
            db.query(TrackSection)
            .join(TrackModule, TrackSection.module_id == TrackModule.id)
            .filter(TrackSection.id == section_id, TrackModule.track_id == track.id)
            .first()
        )
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        before = {"id": str(section.id), "title": section.title, "kind": section.kind,
                  "sequence": section.sequence, "module_id": str(section.module_id)}

        if op_type == "section.remove":
            db.delete(section)
            db.flush()
            log_change(db, user=user, track=track, operation_type=op_type, before=before,
                       after=None, proposal_id=proposal_id, operation_id=operation.id)
            bump_version(track)
            return {"removed": before["id"]}

        if op_type == "section.move":
            if "module_id" in payload and payload["module_id"]:
                new_module = (
                    db.query(TrackModule)
                    .filter(TrackModule.id == payload["module_id"], TrackModule.track_id == track.id)
                    .first()
                )
                if not new_module:
                    raise HTTPException(status_code=404, detail="Target module not found")
                section.module_id = new_module.id
            if "sequence" in payload and payload["sequence"] is not None:
                section.sequence = payload["sequence"]
        else:
            for field in ("title", "objective", "label", "kind", "learning_outcomes", "sequence"):
                if field in payload and payload[field] is not None:
                    setattr(section, field, payload[field])

        db.flush()
        after = {"id": str(section.id), "title": section.title, "kind": section.kind,
                 "sequence": section.sequence, "module_id": str(section.module_id)}
        log_change(db, user=user, track=track, operation_type=op_type, before=before,
                   after=after, proposal_id=proposal_id, operation_id=operation.id)
        bump_version(track)
        return after

    if op_type == "edge.add":
        required = ("from_node_type", "from_node_id", "to_node_type", "to_node_id")
        if any(payload.get(k) is None for k in required):
            raise HTTPException(status_code=400, detail="edge.add requires from/to node type and id")
        edge = SyllabusEdge(
            syllabus_id=track.id,
            from_node_type=payload["from_node_type"],
            from_node_id=payload["from_node_id"],
            to_node_type=payload["to_node_type"],
            to_node_id=payload["to_node_id"],
            kind=payload.get("kind") or "requires",
        )
        db.add(edge)
        db.flush()
        log_change(db, user=user, track=track, operation_type=op_type, before=None,
                   after={"id": str(edge.id)}, proposal_id=proposal_id, operation_id=operation.id)
        bump_version(track)
        return {"edge_id": str(edge.id)}

    if op_type == "edge.remove":
        edge_id = payload.get("edge_id")
        if not edge_id:
            raise HTTPException(status_code=400, detail="edge.remove requires edge_id")
        edge = (
            db.query(SyllabusEdge)
            .filter(SyllabusEdge.id == edge_id, SyllabusEdge.syllabus_id == track.id)
            .first()
        )
        if not edge:
            raise HTTPException(status_code=404, detail="Edge not found")
        db.delete(edge)
        db.flush()
        log_change(db, user=user, track=track, operation_type=op_type,
                   before={"id": str(edge_id)}, after=None,
                   proposal_id=proposal_id, operation_id=operation.id)
        bump_version(track)
        return {"removed": str(edge_id)}

    raise HTTPException(status_code=400, detail=f"Unsupported operation type: {op_type}")
