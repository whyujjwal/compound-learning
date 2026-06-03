"""Batch loaders for public catalog list endpoints (avoids per-track query storms)."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.track_star import TrackStar
from app.models.user import User
from app.services.catalog_quality import rank_score
from app.services.syllabus import clean_list, default_outcomes, module_title_from_label


@dataclass
class CatalogBatchContext:
    materials_by_track: dict[UUID, list[StudyMaterial]] = field(default_factory=dict)
    module_count_by_track: dict[UUID, int] = field(default_factory=dict)
    preview_by_track: dict[UUID, list[str]] = field(default_factory=dict)
    starred_ids: set[UUID] = field(default_factory=set)
    creators: dict[UUID, User] = field(default_factory=dict)


def load_catalog_batch(db: Session, tracks: list[Track], user: User) -> CatalogBatchContext:
    if not tracks:
        return CatalogBatchContext()

    track_ids = [t.id for t in tracks]
    creator_ids = list({t.user_id for t in tracks})

    materials = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id.in_(track_ids))
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .all()
    )
    materials_by_track: dict[UUID, list[StudyMaterial]] = defaultdict(list)
    for material in materials:
        materials_by_track[material.track_id].append(material)

    module_rows = (
        db.query(TrackModule.track_id, func.count(TrackModule.id))
        .filter(TrackModule.track_id.in_(track_ids))
        .group_by(TrackModule.track_id)
        .all()
    )
    module_count_by_track = {row[0]: int(row[1]) for row in module_rows}

    modules_by_track: dict[UUID, list[TrackModule]] = defaultdict(list)
    if track_ids:
        for module in (
            db.query(TrackModule)
            .filter(TrackModule.track_id.in_(track_ids))
            .order_by(TrackModule.sequence.asc(), TrackModule.title.asc())
            .all()
        ):
            modules_by_track[module.track_id].append(module)

    preview_by_track: dict[UUID, list[str]] = {}
    for track in tracks:
        stored = modules_by_track.get(track.id) or []
        if stored:
            preview_by_track[track.id] = [m.title for m in stored[:5]]
            module_count_by_track.setdefault(track.id, len(stored))
        else:
            titles: list[str] = []
            seen: set[str] = set()
            for material in materials_by_track.get(track.id, []):
                title = module_title_from_label(track, material.block_label)
                if title not in seen:
                    seen.add(title)
                    titles.append(title)
            preview_by_track[track.id] = titles[:5]
            module_count_by_track.setdefault(track.id, len(titles))

    starred_ids = {
        row[0]
        for row in db.query(TrackStar.track_id)
        .filter(TrackStar.user_id == user.id, TrackStar.track_id.in_(track_ids))
        .all()
    }

    creators = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(creator_ids)).all()
    }

    return CatalogBatchContext(
        materials_by_track=dict(materials_by_track),
        module_count_by_track=module_count_by_track,
        preview_by_track=preview_by_track,
        starred_ids=starred_ids,
        creators=creators,
    )


def catalog_list_item(
    track: Track,
    user: User,
    ctx: CatalogBatchContext,
    *,
    response_cls,
):
    """Build a catalog track DTO without writes or per-track queries."""
    materials = ctx.materials_by_track.get(track.id, [])
    module_count = ctx.module_count_by_track.get(track.id, 0)
    creator = ctx.creators.get(track.user_id)
    return response_cls(
        id=track.id,
        slug=track.slug,
        name=track.name,
        description=track.description,
        color=track.color,
        creator_name=creator.display_name if creator else None,
        creator_id=track.user_id,
        material_count=len(materials),
        module_count=module_count,
        star_count=track.star_count,
        adoption_count=track.adoption_count,
        rating_count=track.rating_count,
        rating_avg=track.rating_avg,
        quality_score=track.quality_score,
        is_featured=track.is_featured,
        is_starred=track.id in ctx.starred_ids,
        rank_score=rank_score(track, len(materials)),
        source_track_id=track.source_track_id,
        learning_outcomes=clean_list(track.learning_outcomes) or default_outcomes(track, module_count),
        prerequisites=clean_list(track.prerequisites),
        target_audience=track.target_audience,
        estimated_hours=track.estimated_hours
        or (max(1, round(sum(m.estimated_minutes for m in materials) / 60)) if materials else track.estimated_hours),
        difficulty=track.difficulty,
        syllabus_summary=track.syllabus_summary or track.description,
        syllabus_preview=ctx.preview_by_track.get(track.id, []),
        created_at=track.created_at,
        published_at=track.published_at,
    )
