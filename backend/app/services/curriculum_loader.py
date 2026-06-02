"""Load a curriculum JSON file into tracks + materials.

The file shape is documented in docs/curriculum.json. Import is idempotent —
existing materials with the same (track_slug, title) are updated in place; new
ones get a fresh FSRS card.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.user import User
from app.services.bootstrap import ensure_scheduler_params

logger = logging.getLogger("compound.curriculum")


def load_file(path: str | Path) -> dict[str, Any]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Curriculum file not found: {p}")
    return json.loads(p.read_text())


def import_curriculum(
    db: Session,
    user: User,
    data: dict[str, Any],
    prune_orphans: bool = False,
    set_schedule: bool = True,
) -> dict[str, int]:
    """Apply a curriculum to the user.

    If `prune_orphans` is True, materials that exist in the DB but are NOT in the
    incoming JSON (for tracks present in the JSON) get deleted. Useful when
    re-importing a refactored curriculum to clean up legacy items.
    """
    stats = {
        "tracks_created": 0,
        "tracks_updated": 0,
        "materials_created": 0,
        "materials_updated": 0,
        "materials_pruned": 0,
    }

    # Persist a personalized weekly schedule on the user when provided.
    # Skip on the default boot sync so a user's custom schedule isn't clobbered.
    schedule = data.get("weekly_schedule")
    if schedule and set_schedule:
        user.weekly_schedule = schedule

    for track_data in data.get("tracks", []):
        track = (
            db.query(Track)
            .filter(Track.user_id == user.id, Track.slug == track_data["slug"])
            .first()
        )
        if not track:
            track = Track(
                user_id=user.id,
                slug=track_data["slug"],
                name=track_data["name"],
                description=track_data.get("description"),
                color=track_data.get("color", "#e8a849"),
                cognitive_multiplier=track_data.get("cognitive_multiplier", 1.0),
                is_system=track_data.get("is_system", False),
            )
            db.add(track)
            db.flush()
            ensure_scheduler_params(db, user, track)
            stats["tracks_created"] += 1
        else:
            track.name = track_data["name"]
            track.description = track_data.get("description", track.description)
            track.color = track_data.get("color", track.color)
            track.cognitive_multiplier = track_data.get("cognitive_multiplier", track.cognitive_multiplier)
            if "is_system" in track_data:
                track.is_system = track_data["is_system"]
            stats["tracks_updated"] += 1

        incoming_titles = {md["title"] for md in track_data.get("materials", [])}
        if prune_orphans and incoming_titles:
            stale = (
                db.query(StudyMaterial)
                .filter(
                    StudyMaterial.track_id == track.id,
                    StudyMaterial.title.notin_(incoming_titles),
                )
                .all()
            )
            for s in stale:
                db.delete(s)
                stats["materials_pruned"] += 1
            if stale:
                db.flush()

        for material_data in track_data.get("materials", []):
            title = material_data["title"]
            existing = (
                db.query(StudyMaterial)
                .filter(StudyMaterial.track_id == track.id, StudyMaterial.title == title)
                .first()
            )
            if existing:
                existing.raw_content = material_data.get("notes", existing.raw_content)
                existing.external_url = material_data.get("url", existing.external_url)
                existing.block_label = material_data.get("block_label", existing.block_label)
                existing.resource_type = material_data.get("type", existing.resource_type)
                existing.sequence = material_data.get("sequence", existing.sequence)
                existing.estimated_minutes = material_data.get(
                    "estimated_minutes", existing.estimated_minutes
                )
                existing.priority_percent = material_data.get(
                    "priority_percent", existing.priority_percent
                )
                existing.cognitive_cost_multiplier = material_data.get(
                    "cognitive_cost_multiplier", existing.cognitive_cost_multiplier
                )
                stats["materials_updated"] += 1
            else:
                material = StudyMaterial(
                    track_id=track.id,
                    title=title,
                    raw_content=material_data.get("notes"),
                    external_url=material_data.get("url"),
                    block_label=material_data.get("block_label"),
                    resource_type=material_data.get("type"),
                    sequence=material_data.get("sequence", 0),
                    estimated_minutes=material_data.get("estimated_minutes", 20),
                    priority_percent=material_data.get("priority_percent", 50),
                    cognitive_cost_multiplier=material_data.get("cognitive_cost_multiplier", 1.0),
                )
                db.add(material)
                db.flush()
                db.add(Card(user_id=user.id, material_id=material.id))
                stats["materials_created"] += 1

    db.commit()
    logger.info("Curriculum imported: %s", stats)
    return stats
