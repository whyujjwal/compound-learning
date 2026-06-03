from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy.orm import Session

from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule


def clean_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [line.strip(" -") for line in value.splitlines() if line.strip(" -")]
    return []


def module_title_from_label(track: Track, label: str | None) -> str:
    if not label:
        return "Core"
    prefix = f"{track.name} · "
    return label.removeprefix(prefix).strip() or label


def full_block_label(track: Track, module_title: str | None) -> str:
    title = (module_title or "Core").strip() or "Core"
    if title.startswith(f"{track.name} ·"):
        return title
    return f"{track.name} · {title}"


def infer_difficulty(*parts: str | None) -> str:
    text = " ".join(part or "" for part in parts).lower()
    if any(token in text for token in ("hard", "advanced", "capstone", "challenge", "scale", "distributed")):
        return "hard"
    if any(token in text for token in ("easy", "beginner", "intro", "warmup", "foundation")):
        return "easy"
    return "mixed"


def default_outcomes(track: Track, module_count: int) -> list[str]:
    name = track.name
    return [
        f"Navigate the complete {name} roadmap from foundations to applied practice.",
        "Use the highest-priority resources without guessing what to study next.",
        f"Complete checkpoints across {module_count} module{'s' if module_count != 1 else ''}.",
        "Explain core tradeoffs and apply them in quizzes, projects, or design tasks.",
    ]


def ensure_modules_for_track(db: Session, track: Track, materials: list[StudyMaterial] | None = None) -> list[TrackModule]:
    materials = materials if materials is not None else (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id)
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .all()
    )
    existing = {module.title: module for module in track.modules}
    grouped: dict[str, list[StudyMaterial]] = defaultdict(list)
    for material in materials:
        title = module_title_from_label(track, material.block_label)
        grouped[title].append(material)

    changed = False
    for index, (title, group) in enumerate(grouped.items(), start=1):
        module = existing.get(title)
        if not module:
            module = TrackModule(
                track_id=track.id,
                title=title,
                sequence=min((m.sequence for m in group), default=index),
                estimated_minutes=sum(m.estimated_minutes for m in group),
                difficulty=infer_difficulty(*(m.raw_content for m in group), *(m.title for m in group)),
                objective=f"Build working fluency in {title.lower()} through resources, practice, and checkpoints.",
            )
            db.add(module)
            db.flush()
            existing[title] = module
            changed = True
        for material in group:
            if material.module_id != module.id:
                material.module_id = module.id
                changed = True
            if not material.difficulty:
                material.difficulty = infer_difficulty(material.title, material.raw_content, material.resource_type)
                changed = True

    if changed:
        db.flush()
    return sorted(existing.values(), key=lambda module: (module.sequence, module.title))


def syllabus_modules(db: Session, track: Track, materials: list[StudyMaterial] | None = None) -> list[dict[str, Any]]:
    materials = materials if materials is not None else (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id)
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .all()
    )
    modules = ensure_modules_for_track(db, track, materials)
    by_module: dict[Any, list[StudyMaterial]] = defaultdict(list)
    by_title: dict[str, list[StudyMaterial]] = defaultdict(list)
    for material in materials:
        by_module[material.module_id].append(material)
        by_title[module_title_from_label(track, material.block_label)].append(material)

    out: list[dict[str, Any]] = []
    for module in modules:
        group = by_module.get(module.id) or by_title.get(module.title) or []
        minutes = module.estimated_minutes or sum(m.estimated_minutes for m in group)
        difficulty = module.difficulty or infer_difficulty(*(m.title for m in group), *(m.raw_content for m in group))
        out.append(
            {
                "id": module.id,
                "title": module.title,
                "description": module.description,
                "objective": module.objective
                or f"Understand and apply the main ideas in {module.title.lower()}.",
                "sequence": module.sequence,
                "estimated_minutes": minutes,
                "difficulty": difficulty,
                "quiz_prompt": module.quiz_prompt
                or f"Generate a short mastery quiz for {track.name}: {module.title}.",
                "project_prompt": module.project_prompt
                or f"Create a practical checkpoint project for {track.name}: {module.title}.",
                "material_count": len(group),
                "materials": group,
            }
        )
    return out
