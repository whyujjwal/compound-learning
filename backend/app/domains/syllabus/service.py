"""Syllabus application service."""

from __future__ import annotations

import re
import uuid as _uuid
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.domains.syllabus.mapper import syllabus_detail, syllabus_list_items
from app.domains.syllabus.operations import bump_version, log_change
from app.domains.syllabus.queries import get_user_syllabus, get_user_syllabus_by_slug, list_user_syllabi
from app.domains.course.sourcing_service import draft_to_operations, generate_structure
from app.domains.syllabus.proposals import create_proposal
from app.domains.syllabus.schemas import (
    ChangeLogEntry,
    ProposalCreate,
    SyllabusCreate,
    SyllabusDetail,
    SyllabusGenerateRequest,
    SyllabusGenerateResponse,
    SyllabusListItem,
    SyllabusMaterialCreate,
    SyllabusMaterialListResponse,
    SyllabusMaterialSummary,
    SyllabusMaterialUpdate,
    SyllabusModuleCreate,
    SyllabusModuleUpdate,
    SyllabusReorderRequest,
    SyllabusUpdate,
)
from app.services.roadmap.errors import RoadmapError
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.user import User
from app.services.bootstrap import ensure_scheduler_params
from app.services.syllabus import full_block_label, syllabus_modules


def list_syllabi(db: Session, user: User, *, limit: int, offset: int) -> list[SyllabusListItem]:
    tracks = list_user_syllabi(db, user.id, limit=limit, offset=offset)
    return syllabus_list_items(db, tracks)


def get_syllabus(db: Session, user: User, syllabus_id: UUID) -> SyllabusDetail:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return syllabus_detail(db, track, user.id)


def get_syllabus_by_slug(db: Session, user: User, slug: str) -> SyllabusDetail:
    track = get_user_syllabus_by_slug(db, user.id, slug)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return syllabus_detail(db, track, user.id)


def create_syllabus(db: Session, user: User, payload: SyllabusCreate) -> SyllabusDetail:
    existing = (
        db.query(Track)
        .filter(Track.user_id == user.id, Track.slug == payload.slug)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Syllabus slug '{payload.slug}' already exists")

    track = Track(
        user_id=user.id,
        slug=payload.slug,
        name=payload.name,
        description=payload.summary,
        syllabus_summary=payload.summary,
        color=payload.color,
        is_system=False,
        is_public=payload.visibility == "PUBLIC",
        learning_outcomes=payload.learning_outcomes,
        prerequisites=payload.prerequisites,
        target_audience=payload.target_audience,
        estimated_hours=payload.estimated_hours,
        difficulty=payload.difficulty,
        published_at=datetime.now(UTC) if payload.visibility == "PUBLIC" else None,
        version=1,
    )
    db.add(track)
    db.commit()
    db.refresh(track)
    ensure_scheduler_params(db, user, track)
    return syllabus_detail(db, track, user.id)


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "course"
    return f"{base}-{_uuid.uuid4().hex[:6]}"


def generate_syllabus(db: Session, user: User, payload: SyllabusGenerateRequest) -> SyllabusGenerateResponse:
    detail = create_syllabus(db, user, SyllabusCreate(
        slug=_slugify(payload.name), name=payload.name, color=payload.color, visibility="PRIVATE",
    ))
    try:
        draft = generate_structure(payload.goal, level=payload.level, hours=payload.weekly_hours)
    except RoadmapError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    operations = draft_to_operations(draft)
    proposal = create_proposal(db, user, detail.id, ProposalCreate(
        source="AI", instruction=payload.goal,
        summary=draft.get("summary") or "AI generated course structure.",
        operations=operations,
    ))
    return SyllabusGenerateResponse(syllabus=detail, proposal=proposal)


def update_syllabus(db: Session, user: User, syllabus_id: UUID, payload: SyllabusUpdate) -> SyllabusDetail:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    data = payload.model_dump(exclude_unset=True)
    if "summary" in data:
        track.syllabus_summary = data.pop("summary")
        track.description = track.syllabus_summary
    if "visibility" in data:
        track.is_public = data.pop("visibility") == "PUBLIC"
    for field, value in data.items():
        setattr(track, field, value)
    bump_version(track)
    db.commit()
    db.refresh(track)
    return syllabus_detail(db, track, user.id)


def delete_syllabus(db: Session, user: User, syllabus_id: UUID) -> None:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    if track.is_system:
        raise HTTPException(status_code=400, detail="System syllabi cannot be deleted")
    db.delete(track)
    db.commit()


def add_module(db: Session, user: User, syllabus_id: UUID, payload: SyllabusModuleCreate) -> SyllabusDetail:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    existing = (
        db.query(TrackModule)
        .filter(TrackModule.track_id == track.id, TrackModule.title == payload.title)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Module '{payload.title}' already exists")
    module = TrackModule(
        track_id=track.id,
        title=payload.title,
        description=payload.description,
        objective=payload.objective,
        sequence=payload.sequence or 0,
        estimated_minutes=payload.estimated_minutes or 0,
        difficulty=payload.difficulty,
    )
    db.add(module)
    bump_version(track)
    log_change(
        db,
        user=user,
        track=track,
        operation_type="module.add",
        before=None,
        after={"id": str(module.id), "title": module.title},
    )
    db.commit()
    db.refresh(track)
    return syllabus_detail(db, track, user.id)


def update_module(
    db: Session,
    user: User,
    syllabus_id: UUID,
    module_id: UUID,
    payload: SyllabusModuleUpdate,
) -> SyllabusDetail:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    module = (
        db.query(TrackModule)
        .filter(TrackModule.id == module_id, TrackModule.track_id == track.id)
        .first()
    )
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    before = {"id": str(module.id), "title": module.title}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(module, field, value)
    bump_version(track)
    log_change(
        db,
        user=user,
        track=track,
        operation_type="module.update",
        before=before,
        after={"id": str(module.id), "title": module.title},
    )
    db.commit()
    db.refresh(track)
    return syllabus_detail(db, track, user.id)


def delete_module(db: Session, user: User, syllabus_id: UUID, module_id: UUID) -> SyllabusDetail:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    module = (
        db.query(TrackModule)
        .filter(TrackModule.id == module_id, TrackModule.track_id == track.id)
        .first()
    )
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    material_count = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.module_id == module.id)
        .count()
    )
    if material_count:
        raise HTTPException(status_code=409, detail="Module has materials; move or remove them first")
    before = {"id": str(module.id), "title": module.title}
    db.delete(module)
    bump_version(track)
    log_change(db, user=user, track=track, operation_type="module.remove", before=before, after=None)
    db.commit()
    db.refresh(track)
    return syllabus_detail(db, track, user.id)


def add_material(db: Session, user: User, syllabus_id: UUID, payload: SyllabusMaterialCreate) -> SyllabusDetail:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    module = None
    if payload.module_id:
        module = (
            db.query(TrackModule)
            .filter(TrackModule.id == payload.module_id, TrackModule.track_id == track.id)
            .first()
        )
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
    material = StudyMaterial(
        track_id=track.id,
        module_id=payload.module_id,
        title=payload.title,
        raw_content=payload.raw_content,
        external_url=payload.external_url,
        block_label=payload.block_label
        or (full_block_label(track, module.title) if module else f"{track.name} · Core"),
        resource_type=payload.resource_type,
        difficulty=payload.difficulty,
        sequence=payload.sequence or 0,
        estimated_minutes=payload.estimated_minutes,
        priority_percent=payload.priority_percent,
    )
    db.add(material)
    db.flush()
    if payload.create_card:
        db.add(Card(user_id=user.id, material_id=material.id))
    syllabus_modules(db, track)
    bump_version(track)
    log_change(
        db,
        user=user,
        track=track,
        operation_type="material.add",
        before=None,
        after={"id": str(material.id), "title": material.title},
    )
    db.commit()
    db.refresh(track)
    return syllabus_detail(db, track, user.id)


def update_material(
    db: Session,
    user: User,
    syllabus_id: UUID,
    material_id: UUID,
    payload: SyllabusMaterialUpdate,
) -> SyllabusDetail:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    material = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.id == material_id, StudyMaterial.track_id == track.id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    before = {"id": str(material.id), "title": material.title}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(material, field, value)
    bump_version(track)
    log_change(
        db,
        user=user,
        track=track,
        operation_type="material.update",
        before=before,
        after={"id": str(material.id), "title": material.title},
    )
    db.commit()
    db.refresh(track)
    return syllabus_detail(db, track, user.id)


def delete_material(db: Session, user: User, syllabus_id: UUID, material_id: UUID) -> SyllabusDetail:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    material = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.id == material_id, StudyMaterial.track_id == track.id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    before = {"id": str(material.id), "title": material.title}
    db.delete(material)
    bump_version(track)
    log_change(db, user=user, track=track, operation_type="material.remove", before=before, after=None)
    db.commit()
    db.refresh(track)
    return syllabus_detail(db, track, user.id)


def reorder_syllabus(
    db: Session,
    user: User,
    syllabus_id: UUID,
    payload: SyllabusReorderRequest,
) -> SyllabusDetail:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    if payload.modules:
        module_ids = {item.id for item in payload.modules}
        modules = db.query(TrackModule).filter(TrackModule.track_id == track.id).all()
        if module_ids != {m.id for m in modules}:
            raise HTTPException(status_code=400, detail="Module reorder must include all modules")
        seq_by_id = {item.id: item.sequence for item in payload.modules}
        for module in modules:
            module.sequence = seq_by_id[module.id]

    if payload.materials:
        material_ids = {item.id for item in payload.materials}
        materials = db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).all()
        known_ids = {m.id for m in materials}
        unknown = material_ids - known_ids
        if unknown:
            raise HTTPException(status_code=400, detail="Unknown material IDs in reorder payload")
        seq_by_id = {item.id: item.sequence for item in payload.materials}
        for material in materials:
            if material.id in seq_by_id:
                material.sequence = seq_by_id[material.id]

    bump_version(track)
    log_change(
        db,
        user=user,
        track=track,
        operation_type="module.reorder" if payload.modules else "material.reorder",
        before=None,
        after={"modules": len(payload.modules or []), "materials": len(payload.materials or [])},
    )
    db.commit()
    db.refresh(track)
    return syllabus_detail(db, track, user.id)


def list_history(db: Session, user: User, syllabus_id: UUID, *, limit: int = 50) -> list:
    from app.models.syllabus_change_log import SyllabusChangeLog

    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    rows = (
        db.query(SyllabusChangeLog)
        .filter(SyllabusChangeLog.syllabus_id == track.id, SyllabusChangeLog.user_id == user.id)
        .order_by(SyllabusChangeLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        ChangeLogEntry(
            id=row.id,
            proposal_id=row.proposal_id,
            operation_id=row.operation_id,
            operation_type=row.operation_type,
            before=row.before,
            after=row.after,
            created_at=row.created_at,
        )
        for row in rows
    ]


def list_materials(
    db: Session,
    user: User,
    syllabus_id: UUID,
    *,
    q: str | None = None,
    module_id: UUID | None = None,
    resource_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> SyllabusMaterialListResponse:
    track = get_user_syllabus(db, user.id, syllabus_id)
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    query = db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id)
    if module_id:
        query = query.filter(StudyMaterial.module_id == module_id)
    if resource_type:
        query = query.filter(StudyMaterial.resource_type == resource_type)
    if q:
        query = query.filter(StudyMaterial.title.ilike(f"%{q}%"))

    total = query.count()
    rows = (
        query.order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    material_ids = [m.id for m in rows]
    cards = (
        db.query(Card)
        .filter(Card.user_id == user.id, Card.material_id.in_(material_ids))
        .all()
        if material_ids
        else []
    )
    card_by_material = {c.material_id: c for c in cards}
    items = [
        SyllabusMaterialSummary(
            id=m.id,
            title=m.title,
            external_url=m.external_url,
            resource_type=m.resource_type,
            estimated_minutes=m.estimated_minutes or 15,
            sequence=m.sequence or 0,
            difficulty=m.difficulty,
            card_state=card_by_material[m.id].state.value if m.id in card_by_material else None,
        )
        for m in rows
    ]
    return SyllabusMaterialListResponse(items=items, total=total, limit=limit, offset=offset)
