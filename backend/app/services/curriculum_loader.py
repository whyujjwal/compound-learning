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
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.user import User
from app.services.bootstrap import ensure_scheduler_params
from app.services.syllabus import full_block_label, infer_difficulty, module_title_from_label

logger = logging.getLogger("compound.curriculum")


def _flatten_track_materials(track_data: dict[str, Any]) -> list[dict[str, Any]]:
    materials = list(track_data.get("materials") or [])
    if materials:
        return materials
    flattened: list[dict[str, Any]] = []
    for module in track_data.get("modules") or []:
        module_title = module.get("title") or module.get("name") or "Core"
        for item in module.get("materials") or []:
            copy = dict(item)
            copy.setdefault("module", module_title)
            copy.setdefault("block_label", f"{track_data.get('name', 'Track')} · {module_title}")
            flattened.append(copy)
    return flattened


def _module_specs(track_data: dict[str, Any], materials: list[dict[str, Any]]) -> list[dict[str, Any]]:
    specs = []
    seen: set[str] = set()
    for index, module in enumerate(track_data.get("modules") or [], start=1):
        title = module.get("title") or module.get("name") or f"Module {index}"
        if title in seen:
            continue
        seen.add(title)
        specs.append(
            {
                "title": title,
                "description": module.get("description"),
                "objective": module.get("objective") or module.get("learning_objective"),
                "sequence": module.get("sequence", index),
                "estimated_minutes": module.get("estimated_minutes", 0),
                "difficulty": module.get("difficulty"),
                "quiz_prompt": module.get("quiz_prompt") or module.get("quiz"),
                "project_prompt": module.get("project_prompt") or module.get("project"),
            }
        )
    for item in materials:
        title = item.get("module") or item.get("module_title") or module_title_from_label(type("T", (), {"name": track_data.get("name", "Track")})(), item.get("block_label"))
        if title in seen:
            continue
        seen.add(title)
        specs.append(
            {
                "title": title,
                "description": None,
                "objective": f"Build fluency in {title.lower()} with resources, practice, and a checkpoint.",
                "sequence": len(specs) + 1,
                "estimated_minutes": 0,
                "difficulty": None,
                "quiz_prompt": None,
                "project_prompt": None,
            }
        )
    return specs


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
        materials_data = _flatten_track_materials(track_data)
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
                is_public=track_data.get("is_public", True),
                is_featured=track_data.get("is_featured", False),
                generation_prompt=track_data.get("generation_prompt"),
                learning_outcomes=track_data.get("learning_outcomes") or track_data.get("outcomes"),
                prerequisites=track_data.get("prerequisites"),
                target_audience=track_data.get("target_audience"),
                estimated_hours=track_data.get("estimated_hours"),
                difficulty=track_data.get("difficulty"),
                syllabus_summary=track_data.get("syllabus_summary") or track_data.get("syllabus"),
                published_at=datetime.now(UTC) if track_data.get("is_public", True) else None,
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
            if "is_public" in track_data:
                track.is_public = track_data["is_public"]
                track.published_at = track.published_at or (datetime.now(UTC) if track.is_public else None)
            if "is_featured" in track_data:
                track.is_featured = track_data["is_featured"]
            if "generation_prompt" in track_data:
                track.generation_prompt = track_data["generation_prompt"]
            if "learning_outcomes" in track_data or "outcomes" in track_data:
                track.learning_outcomes = track_data.get("learning_outcomes") or track_data.get("outcomes")
            if "prerequisites" in track_data:
                track.prerequisites = track_data.get("prerequisites")
            if "target_audience" in track_data:
                track.target_audience = track_data.get("target_audience")
            if "estimated_hours" in track_data:
                track.estimated_hours = track_data.get("estimated_hours")
            if "difficulty" in track_data:
                track.difficulty = track_data.get("difficulty")
            if "syllabus_summary" in track_data or "syllabus" in track_data:
                track.syllabus_summary = track_data.get("syllabus_summary") or track_data.get("syllabus")
            stats["tracks_updated"] += 1

        module_by_title: dict[str, TrackModule] = {}
        for spec in _module_specs(track_data, materials_data):
            title = spec["title"]
            module = (
                db.query(TrackModule)
                .filter(TrackModule.track_id == track.id, TrackModule.title == title)
                .first()
            )
            if not module:
                module = TrackModule(track_id=track.id, title=title)
                db.add(module)
                db.flush()
            module.description = spec.get("description") or module.description
            module.objective = spec.get("objective") or module.objective
            module.sequence = spec.get("sequence", module.sequence)
            module.estimated_minutes = spec.get("estimated_minutes") or module.estimated_minutes
            module.difficulty = spec.get("difficulty") or module.difficulty
            module.quiz_prompt = spec.get("quiz_prompt") or module.quiz_prompt
            module.project_prompt = spec.get("project_prompt") or module.project_prompt
            module_by_title[title] = module

        incoming_titles = {md["title"] for md in materials_data}
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

        for material_data in materials_data:
            title = material_data["title"]
            module_title = material_data.get("module") or material_data.get("module_title") or module_title_from_label(track, material_data.get("block_label"))
            module = module_by_title.get(module_title)
            if not module:
                module = TrackModule(
                    track_id=track.id,
                    title=module_title,
                    objective=f"Build fluency in {module_title.lower()} with resources, practice, and a checkpoint.",
                    sequence=len(module_by_title) + 1,
                )
                db.add(module)
                db.flush()
                module_by_title[module_title] = module
            block_label = material_data.get("block_label") or full_block_label(track, module_title)
            existing = (
                db.query(StudyMaterial)
                .filter(StudyMaterial.track_id == track.id, StudyMaterial.title == title)
                .first()
            )
            if existing:
                existing.raw_content = material_data.get("notes", existing.raw_content)
                existing.external_url = material_data.get("url", existing.external_url)
                existing.module_id = module.id
                existing.block_label = block_label
                existing.resource_type = material_data.get("type", existing.resource_type)
                existing.difficulty = material_data.get("difficulty") or infer_difficulty(title, existing.raw_content, existing.resource_type)
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
                    module_id=module.id,
                    title=title,
                    raw_content=material_data.get("notes"),
                    external_url=material_data.get("url"),
                    block_label=block_label,
                    resource_type=material_data.get("type"),
                    difficulty=material_data.get("difficulty") or infer_difficulty(title, material_data.get("notes"), material_data.get("type")),
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
