from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.config import settings
from app.services.research_tools import gather_track_research
from app.services.roadmap.constants import DAY_KEYS, MAX_TRACKS, PALETTE
from app.services.roadmap.errors import RoadmapError
from app.services.roadmap.json_utils import extract_json
from app.services.roadmap.llm import call_model_json, invoke_llm, is_truncated
from app.services.roadmap.normalize import normalize_curriculum
from app.services.roadmap.prompts import (
    SCHEDULE_PROMPT,
    SYSTEM_PROMPT,
    TRACK_MATERIALS_PROMPT,
    TRACK_PLAN_PROMPT,
    TRACK_UPDATE_PROMPT,
)

logger = logging.getLogger("compound.roadmap")


def build_user_prompt(goals: str, weekly_hours: int, level: str | None) -> str:
    level_line = f"Current level: {level}.\n" if level else ""
    return (
        f"My learning goals:\n{goals}\n\n"
        f"{level_line}"
        f"I can study about {weekly_hours} hours per week.\n\n"
        "Design my complete roadmap now as JSON only."
    )


def generate_single_pass(goals: str, weekly_hours: int, level: str | None) -> dict[str, Any]:
    user_prompt = build_user_prompt(goals, weekly_hours, level)
    max_tokens = max(settings.ai_max_tokens, 16384)
    raw, finish = invoke_llm(SYSTEM_PROMPT, user_prompt, max_tokens)
    if not raw.strip():
        raise RoadmapError("The AI returned an empty response. Try again.")
    if is_truncated(finish):
        raise RoadmapError("__truncated__")
    data = extract_json(raw)
    data = normalize_curriculum(data)
    if not data.get("tracks"):
        raise RoadmapError("The generated roadmap had no tracks. Try a more specific goal.")
    return data


def default_schedule(slugs: list[str]) -> dict[str, list[dict[str, Any]]]:
    schedule: dict[str, list[dict[str, Any]]] = {d: [] for d in DAY_KEYS}
    weekdays = DAY_KEYS[:6]
    for i, slug in enumerate(slugs):
        day = weekdays[i % len(weekdays)]
        schedule[day].append({"block": len(schedule[day]) + 1, "track": slug})
    schedule["sunday"] = [{"block": 1, "track": "review"}]
    return schedule


def generate_chunked(goals: str, weekly_hours: int, level: str | None) -> dict[str, Any]:
    logger.info("Using chunked roadmap generation for large/complex goals")
    level_line = f"Current level: {level}.\n" if level else ""
    plan_prompt = (
        f"My learning goals:\n{goals}\n\n{level_line}"
        f"I can study about {weekly_hours} hours per week.\n\n"
        "Design the track outline now as JSON only."
    )
    plan = call_model_json(TRACK_PLAN_PROMPT, plan_prompt, max_tokens=4096)
    track_stubs = (plan.get("tracks") or [])[:MAX_TRACKS]
    if not track_stubs:
        raise RoadmapError("Could not plan tracks for your goals. Try being more specific.")

    tracks: list[dict[str, Any]] = []
    for i, stub in enumerate(track_stubs):
        slug = stub.get("slug") or stub.get("name") or f"track-{i+1}"
        name = stub.get("name") or str(slug).replace("-", " ").title()
        research = gather_track_research(name, goals)
        materials_prompt = (
            f"Track: {name}\n"
            f"Description: {stub.get('description') or ''}\n"
            f"Learner level: {level or 'unspecified'}\n\n"
            f"RESEARCH CONTEXT:\n{research}\n\n"
            "Design materials for this track only as JSON."
        )
        try:
            mat_data = call_model_json(TRACK_MATERIALS_PROMPT, materials_prompt, max_tokens=8192)
            materials = mat_data.get("materials") or []
        except RoadmapError as e:
            if str(e) == "__truncated__":
                logger.warning("Materials truncated for track %s — using partial set", slug)
                materials = []
            else:
                raise
        tracks.append(
            {
                "slug": slug,
                "name": name,
                "description": stub.get("description"),
                "color": stub.get("color") or PALETTE[i % len(PALETTE)],
                "cognitive_multiplier": stub.get("cognitive_multiplier", 1.0),
                "learning_outcomes": stub.get("learning_outcomes") or [],
                "prerequisites": stub.get("prerequisites") or [],
                "target_audience": stub.get("target_audience"),
                "estimated_hours": stub.get("estimated_hours"),
                "difficulty": stub.get("difficulty"),
                "syllabus_summary": stub.get("syllabus_summary"),
                "modules": stub.get("modules") or [],
                "materials": materials,
            }
        )

    slugs = [t["slug"] for t in tracks]
    schedule_prompt = (
        f"Track slugs: {', '.join(slugs)}\n"
        f"Weekly study hours: {weekly_hours}\n\n"
        "Build the weekly_schedule JSON."
    )
    try:
        sched_data = call_model_json(SCHEDULE_PROMPT, schedule_prompt, max_tokens=2048)
        schedule = sched_data.get("weekly_schedule") or {}
    except RoadmapError:
        schedule = default_schedule(slugs)

    data = normalize_curriculum({"version": "1.0", "tracks": tracks, "weekly_schedule": schedule})
    if not data.get("tracks"):
        raise RoadmapError("Could not generate a roadmap. Try again.")
    return data


def should_chunk_first(goals: str) -> bool:
    if len(goals) > 400:
        return True
    goal_markers = len(re.findall(r"[,;\n]|\band\b|\bor\b", goals, re.I))
    return goal_markers >= 4


def generate_roadmap(goals: str, weekly_hours: int = 10, level: str | None = None) -> dict[str, Any]:
    if not settings.ai_enabled:
        raise RoadmapError(
            "AI is not configured. Set the API key for your provider to generate roadmaps."
        )
    if not goals or not goals.strip():
        raise RoadmapError("Please describe what you want to learn.")

    if should_chunk_first(goals):
        return generate_chunked(goals, weekly_hours, level)

    last_error: RoadmapError | None = None
    for attempt in range(2):
        try:
            return generate_single_pass(goals, weekly_hours, level)
        except json.JSONDecodeError as e:
            logger.warning("Single-pass JSON parse failed (attempt %d): %s", attempt + 1, e)
            last_error = RoadmapError("Could not parse the generated roadmap. Try rephrasing your goals.")
        except RoadmapError as e:
            if str(e) == "__truncated__":
                logger.info("Single-pass truncated — falling back to chunked generation")
                try:
                    return generate_chunked(goals, weekly_hours, level)
                except RoadmapError as chunk_err:
                    last_error = chunk_err
                    break
            last_error = e

    if last_error and str(last_error) != "__truncated__":
        raise last_error
    raise RoadmapError("Could not generate a roadmap. Try again.")


def generate_track_update(track: Any, materials: list[Any], instruction: str) -> dict[str, Any]:
    if not settings.ai_enabled:
        raise RoadmapError(
            "AI is not configured. Set the API key for your provider to update tracks."
        )
    if not instruction or not instruction.strip():
        raise RoadmapError("Please describe how you want to update the track.")

    existing = []
    for m in materials[:80]:
        existing.append(
            {
                "title": m.title,
                "block_label": m.block_label,
                "type": m.resource_type,
                "estimated_minutes": m.estimated_minutes,
            }
        )

    research = gather_track_research(track.name, instruction)
    user_prompt = (
        f"Track: {track.name}\n"
        f"Description: {track.description or ''}\n"
        f"Existing materials JSON:\n{json.dumps(existing, ensure_ascii=False)}\n\n"
        f"Learner instruction:\n{instruction}\n\n"
        f"RESEARCH CONTEXT:\n{research}\n\n"
        "Return the track update JSON now."
    )
    data = call_model_json(TRACK_UPDATE_PROMPT, user_prompt, max_tokens=8192)
    materials_out = data.get("materials") or []
    clean = normalize_curriculum(
        {
            "tracks": [
                {
                    "slug": getattr(track, "slug", "track"),
                    "name": track.name,
                    "description": track.description,
                    "materials": materials_out,
                }
            ],
            "weekly_schedule": {},
        }
    )
    return {
        "summary": data.get("summary") or "Track updated.",
        "materials": clean["tracks"][0].get("materials") or [],
    }
