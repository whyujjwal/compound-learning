"""Assemble a Track into a nested 3-level CourseTree with progress roll-ups."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.domains.course.schemas import CourseMaterial, CourseModule, CourseSection, CourseTree
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.track_section import TrackSection
from app.services.mastery import is_mastered
from app.services.syllabus import clean_list, default_outcomes

_UNSORTED_KEY = "unsorted"


def _material_dto(mat: StudyMaterial, card: Card | None) -> CourseMaterial:
    started = bool(card and card.reps > 0)
    mastered = bool(card and is_mastered(card))
    return CourseMaterial(
        id=mat.id,
        title=mat.title,
        resource_type=mat.resource_type,
        external_url=mat.external_url,
        has_content=bool(mat.raw_content),
        provider=mat.provider,
        author=mat.author,
        license=mat.license,
        kind=mat.kind or "core",
        label=mat.label,
        difficulty=mat.difficulty,
        estimated_minutes=mat.estimated_minutes,
        priority_percent=mat.priority_percent,
        sequence=mat.sequence,
        resource_quality_score=mat.resource_quality_score,
        resource_health_status=mat.resource_health_status,
        card_state=card.state.value if card else None,
        started=started,
        mastered=mastered,
    )


def build_course_tree(db: Session, track: Track, user_id: UUID) -> CourseTree:
    modules = (
        db.query(TrackModule)
        .filter(TrackModule.track_id == track.id)
        .order_by(TrackModule.sequence.asc(), TrackModule.created_at.asc())
        .all()
    )
    sections = (
        db.query(TrackSection)
        .join(TrackModule, TrackSection.module_id == TrackModule.id)
        .filter(TrackModule.track_id == track.id)
        .order_by(TrackSection.sequence.asc(), TrackSection.created_at.asc())
        .all()
    )
    materials = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id)
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .all()
    )
    cards = (
        db.query(Card)
        .join(StudyMaterial, Card.material_id == StudyMaterial.id)
        .filter(StudyMaterial.track_id == track.id, Card.user_id == user_id)
        .all()
    )
    card_by_material = {c.material_id: c for c in cards}

    sections_by_module: dict[UUID, list[TrackSection]] = {}
    for sec in sections:
        sections_by_module.setdefault(sec.module_id, []).append(sec)

    materials_by_section: dict[str, list[StudyMaterial]] = {}
    for mat in materials:
        key = str(mat.section_id) if mat.section_id else _UNSORTED_KEY
        materials_by_section.setdefault(key, []).append(mat)

    module_dtos: list[CourseModule] = []
    total_materials = 0
    total_mastered = 0

    for module in modules:
        section_dtos: list[CourseSection] = []
        module_mat_count = module_started = module_mastered = module_minutes = 0

        module_sections = list(sections_by_module.get(module.id, []))
        unsorted_for_module = [
            m for m in materials_by_section.get(_UNSORTED_KEY, []) if m.module_id == module.id
        ]

        for sec in module_sections:
            sec_materials = materials_by_section.get(str(sec.id), [])
            sec_dtos = [_material_dto(m, card_by_material.get(m.id)) for m in sec_materials]
            started = sum(1 for m in sec_dtos if m.started)
            mastered = sum(1 for m in sec_dtos if m.mastered)
            minutes = sum(m.estimated_minutes for m in sec_dtos)
            section_dtos.append(CourseSection(
                id=sec.id, title=sec.title, objective=sec.objective, label=sec.label,
                kind=sec.kind or "core", learning_outcomes=clean_list(sec.learning_outcomes),
                sequence=sec.sequence, estimated_minutes=minutes,
                material_count=len(sec_dtos), started_count=started, mastered_count=mastered,
                materials=sec_dtos,
            ))
            module_mat_count += len(sec_dtos)
            module_started += started
            module_mastered += mastered
            module_minutes += minutes

        if unsorted_for_module:
            sec_dtos = [_material_dto(m, card_by_material.get(m.id)) for m in unsorted_for_module]
            started = sum(1 for m in sec_dtos if m.started)
            mastered = sum(1 for m in sec_dtos if m.mastered)
            minutes = sum(m.estimated_minutes for m in sec_dtos)
            section_dtos.append(CourseSection(
                id=module.id, title="General", objective=None, label=None, kind="core",
                learning_outcomes=[], sequence=len(section_dtos), estimated_minutes=minutes,
                material_count=len(sec_dtos), started_count=started, mastered_count=mastered,
                materials=sec_dtos,
            ))
            module_mat_count += len(sec_dtos)
            module_started += started
            module_mastered += mastered
            module_minutes += minutes

        module_dtos.append(CourseModule(
            id=module.id, title=module.title, objective=module.objective, label=module.label,
            kind=module.kind or "core", learning_outcomes=clean_list(module.learning_outcomes),
            sequence=module.sequence, estimated_minutes=module_minutes,
            difficulty=module.difficulty,
            material_count=module_mat_count, started_count=module_started,
            mastered_count=module_mastered, sections=section_dtos,
        ))
        total_materials += module_mat_count
        total_mastered += module_mastered

    outcomes = clean_list(track.learning_outcomes) or default_outcomes(track, len(module_dtos))
    return CourseTree(
        id=track.id, slug=track.slug, name=track.name,
        summary=track.syllabus_summary or track.description, color=track.color,
        difficulty=track.difficulty, estimated_hours=track.estimated_hours,
        outcomes=outcomes, prerequisites=clean_list(track.prerequisites),
        version=getattr(track, "version", 1) or 1,
        module_count=len(module_dtos), material_count=total_materials,
        mastered_count=total_mastered, modules=module_dtos,
    )
