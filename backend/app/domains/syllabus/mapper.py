"""Map Track models to canonical syllabus responses."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.domains.syllabus.queries import batch_syllabus_counts
from app.domains.syllabus.schemas import (
    SyllabusDetail,
    SyllabusListItem,
    SyllabusMaterialSummary,
    SyllabusModuleSummary,
    SyllabusPermissions,
)
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.services.mastery import is_mastered
from app.services.syllabus import clean_list, default_outcomes, syllabus_modules


def _visibility(track: Track) -> str:
    return "PUBLIC" if track.is_public else "PRIVATE"


def _health_score(*, material_count: int, mastered_count: int, due_review_count: int) -> int:
    if material_count == 0:
        return 100
    mastery_pct = mastered_count / material_count
    due_penalty = min(30, due_review_count * 2)
    return max(0, min(100, round(mastery_pct * 100 - due_penalty + 20)))


def syllabus_list_item(track: Track, counts: dict[str, int]) -> SyllabusListItem:
    material_count = counts.get("material_count", 0)
    mastered_count = counts.get("mastered_count", 0)
    due_review_count = counts.get("due_review_count", 0)
    return SyllabusListItem(
        id=track.id,
        slug=track.slug,
        name=track.name,
        summary=track.syllabus_summary or track.description,
        color=track.color,
        visibility=_visibility(track),
        module_count=counts.get("module_count", 0),
        material_count=material_count,
        started_count=counts.get("started_count", 0),
        mastered_count=mastered_count,
        due_review_count=due_review_count,
        health_score=_health_score(
            material_count=material_count,
            mastered_count=mastered_count,
            due_review_count=due_review_count,
        ),
        updated_at=track.created_at,
    )


def syllabus_list_items(db: Session, tracks: list[Track]) -> list[SyllabusListItem]:
    if not tracks:
        return []
    counts_by_id = batch_syllabus_counts(db, [t.id for t in tracks])
    return [syllabus_list_item(t, counts_by_id.get(t.id, {})) for t in tracks]


def _module_response(
    db: Session,
    track: Track,
    module_data: dict,
    card_by_material: dict[UUID, Card],
) -> SyllabusModuleSummary:
    module_materials = module_data.pop("materials")
    started = 0
    mastered = 0
    material_responses = []
    for material in module_materials:
        card = card_by_material.get(material.id) or db.query(Card).filter(Card.material_id == material.id).first()
        if card and card.reps > 0:
            started += 1
        if card and is_mastered(card):
            mastered += 1
        material_responses.append(
            SyllabusMaterialSummary(
                id=material.id,
                title=material.title,
                external_url=material.external_url,
                resource_type=material.resource_type,
                estimated_minutes=material.estimated_minutes,
                sequence=material.sequence,
                difficulty=material.difficulty,
                resource_quality_score=material.resource_quality_score,
                card_state=card.state.value if card else None,
            )
        )
    return SyllabusModuleSummary(
        **module_data,
        started_count=started,
        mastered_count=mastered,
        materials=material_responses,
    )


def syllabus_detail(db: Session, track: Track, user_id: UUID) -> SyllabusDetail:
    materials = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id)
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .all()
    )
    cards = (
        db.query(Card)
        .join(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id, Card.user_id == user_id)
        .all()
    )
    card_by_material = {c.material_id: c for c in cards}
    modules = []
    for module in syllabus_modules(db, track, materials):
        modules.append(_module_response(db, track, module, card_by_material))

    outcomes = clean_list(track.learning_outcomes) or default_outcomes(track, len(modules))
    return SyllabusDetail(
        id=track.id,
        slug=track.slug,
        name=track.name,
        summary=track.syllabus_summary or track.description,
        color=track.color,
        visibility=_visibility(track),
        outcomes=outcomes,
        modules=modules,
        version=getattr(track, "version", 1) or 1,
        permissions=SyllabusPermissions(
            can_edit=not track.is_system,
            can_publish=not track.is_system,
        ),
    )
