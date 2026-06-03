from __future__ import annotations

import re
from typing import Any

from app.services.roadmap.constants import DAY_KEYS, PALETTE


def normalize_curriculum(data: dict[str, Any]) -> dict[str, Any]:
    tracks = data.get("tracks") or []
    seen_slugs: set[str] = set()
    for i, track in enumerate(tracks):
        slug = (track.get("slug") or track.get("name") or f"track-{i+1}").lower()
        slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-") or f"track-{i+1}"
        while slug in seen_slugs:
            slug = f"{slug}-{i+1}"
        seen_slugs.add(slug)
        track["slug"] = slug
        track.setdefault("name", slug.replace("-", " ").title())
        track.setdefault("description", None)
        track.setdefault("learning_outcomes", [])
        track.setdefault("prerequisites", [])
        track.setdefault("target_audience", None)
        track.setdefault("estimated_hours", None)
        track.setdefault("difficulty", None)
        track.setdefault("syllabus_summary", track.get("description"))
        track["color"] = track.get("color") or PALETTE[i % len(PALETTE)]
        try:
            track["cognitive_multiplier"] = float(track.get("cognitive_multiplier", 1.0))
        except (TypeError, ValueError):
            track["cognitive_multiplier"] = 1.0
        track["is_system"] = False

        materials = track.get("materials") or []
        modules = track.get("modules") or []
        module_titles = {
            str(module.get("title") or module.get("name") or "").strip()
            for module in modules
            if str(module.get("title") or module.get("name") or "").strip()
        }
        for j, m in enumerate(materials):
            m.setdefault("title", f"Concept {j+1}")
            m.setdefault("sequence", j + 1)
            label = str(m.get("block_label") or "").strip()
            if not label:
                module_title = m.get("module") or m.get("module_title") or (
                    next(iter(module_titles)) if module_titles else "Core"
                )
                m["block_label"] = f"{track['name']} · {module_title}"
            elif "·" not in label and not label.startswith(track["name"]):
                m["block_label"] = f"{track['name']} · {label}"
            try:
                m["estimated_minutes"] = max(5, int(m.get("estimated_minutes", 20)))
            except (TypeError, ValueError):
                m["estimated_minutes"] = 20
            try:
                m["priority_percent"] = min(100, max(1, int(m.get("priority_percent", 50))))
            except (TypeError, ValueError):
                m["priority_percent"] = 50
            try:
                m["cognitive_cost_multiplier"] = float(m.get("cognitive_cost_multiplier", 1.0))
            except (TypeError, ValueError):
                m["cognitive_cost_multiplier"] = 1.0
        track["materials"] = materials
        if not modules:
            labels = []
            for m in materials:
                label = str(m.get("block_label") or "Core")
                title = label.split("·", 1)[1].strip() if "·" in label else label
                if title not in labels:
                    labels.append(title)
            modules = [
                {
                    "title": title,
                    "description": f"{track['name']} module covering {title.lower()}.",
                    "objective": (
                        f"Build working fluency in {title.lower()} through resources, "
                        "practice, and checkpoints."
                    ),
                    "sequence": idx + 1,
                    "estimated_minutes": sum(
                        int(m.get("estimated_minutes", 20) or 20)
                        for m in materials
                        if title in str(m.get("block_label") or "")
                    ),
                    "difficulty": "mixed",
                    "quiz_prompt": f"Create a mastery quiz for {track['name']} · {title}.",
                    "project_prompt": f"Create a practical project checkpoint for {track['name']} · {title}.",
                }
                for idx, title in enumerate(labels or ["Core"])
            ]
        track["modules"] = modules

    valid_slugs = {t["slug"] for t in tracks} | {"review"}
    schedule = data.get("weekly_schedule") or {}
    clean_schedule: dict[str, list[dict[str, Any]]] = {}
    for day in DAY_KEYS:
        blocks = schedule.get(day) or []
        clean_blocks = []
        for b in blocks:
            slug = b.get("track")
            if slug in valid_slugs:
                clean_blocks.append({"block": b.get("block", len(clean_blocks) + 1), "track": slug})
        clean_schedule[day] = clean_blocks
    data["weekly_schedule"] = clean_schedule
    data["tracks"] = tracks
    data.setdefault("version", "1.0")
    return data
