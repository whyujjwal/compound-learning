"""Clone a track (with modules -> sections -> materials + cards) into a user's library."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.track_section import TrackSection
from app.models.user import User
from app.services.bootstrap import ensure_scheduler_params


def _unique_slug(db: Session, user: User, base: str) -> str:
    slug = base
    n = 1
    while db.query(Track).filter(Track.user_id == user.id, Track.slug == slug).first():
        n += 1
        slug = f"{base}-{n}"
    return slug


def find_user_clone(db: Session, user: User, source_id) -> Track | None:
    """Return the user's existing clone of `source_id`, if any. The anti-duplicate guard."""
    return (
        db.query(Track)
        .filter(Track.user_id == user.id, Track.source_track_id == source_id)
        .first()
    )


def clone_track(db: Session, source: Track, user: User) -> Track:
    """Deep-copy `source` into `user`'s library, unless a clone already exists. Does NOT commit."""
    existing = find_user_clone(db, user, source.id)
    if existing:
        return existing
    track = Track(
        user_id=user.id,
        slug=_unique_slug(db, user, source.slug),
        name=source.name,
        description=source.description,
        color=source.color,
        cognitive_multiplier=source.cognitive_multiplier,
        is_system=False,
        is_public=False,
        is_featured=False,
        source_track_id=source.id,
        generation_prompt=source.generation_prompt,
        learning_outcomes=source.learning_outcomes,
        prerequisites=source.prerequisites,
        target_audience=source.target_audience,
        estimated_hours=source.estimated_hours,
        difficulty=source.difficulty,
        syllabus_summary=source.syllabus_summary,
    )
    db.add(track)
    db.flush()
    ensure_scheduler_params(db, user, track)

    module_map: dict = {}
    section_map: dict = {}
    for module in (
        db.query(TrackModule).filter(TrackModule.track_id == source.id)
        .order_by(TrackModule.sequence.asc()).all()
    ):
        copy_module = TrackModule(
            track_id=track.id, title=module.title, description=module.description,
            objective=module.objective, sequence=module.sequence,
            estimated_minutes=module.estimated_minutes, difficulty=module.difficulty,
            quiz_prompt=module.quiz_prompt, project_prompt=module.project_prompt,
            label=module.label, kind=module.kind or "core",
            learning_outcomes=module.learning_outcomes,
        )
        db.add(copy_module)
        db.flush()
        module_map[module.id] = copy_module.id
        for section in (
            db.query(TrackSection).filter(TrackSection.module_id == module.id)
            .order_by(TrackSection.sequence.asc()).all()
        ):
            copy_section = TrackSection(
                module_id=copy_module.id, title=section.title, objective=section.objective,
                label=section.label, kind=section.kind or "core",
                learning_outcomes=section.learning_outcomes, sequence=section.sequence,
            )
            db.add(copy_section)
            db.flush()
            section_map[section.id] = copy_section.id

    for material in (
        db.query(StudyMaterial).filter(StudyMaterial.track_id == source.id)
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc()).all()
    ):
        copy = StudyMaterial(
            track_id=track.id,
            module_id=module_map.get(material.module_id),
            section_id=section_map.get(material.section_id),
            title=material.title, raw_content=material.raw_content,
            external_url=material.external_url, block_label=material.block_label,
            resource_type=material.resource_type, difficulty=material.difficulty,
            sequence=material.sequence, cognitive_cost_multiplier=material.cognitive_cost_multiplier,
            estimated_minutes=material.estimated_minutes, priority_percent=material.priority_percent,
            provider=material.provider, author=material.author, license=material.license,
            kind=material.kind or "core", label=material.label,
            resource_health_status=material.resource_health_status,
            resource_quality_score=material.resource_quality_score,
        )
        db.add(copy)
        db.flush()
        db.add(Card(user_id=user.id, material_id=copy.id))

    source.adoption_count = (source.adoption_count or 0) + 1
    return track


def seed_user_default_tracks(db: Session, user: User) -> int:
    """Clone every system template into `user` exactly once. Idempotent. Returns count newly cloned."""
    templates = (
        db.query(Track)
        .filter(Track.is_system.is_(True))
        .order_by(Track.created_at.asc())
        .all()
    )
    cloned = 0
    for template in templates:
        if template.user_id == user.id:
            continue
        if find_user_clone(db, user, template.id):
            continue
        clone_track(db, template, user)
        cloned += 1
    return cloned
