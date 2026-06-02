"""AI-powered personalized roadmap generation.

Given a learner's free-text goals and weekly time budget, ask the configured AI
provider to produce a full curriculum JSON (tracks + materials with real,
high-quality internet resources + a weekly study schedule) that can be fed
straight into ``import_curriculum``.

Large roadmaps are built in multiple passes (track outline → per-track materials
with GitHub/web research → weekly schedule) so generation never fails purely
because the output is too long.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.config import settings
from app.services.research_tools import gather_track_research

logger = logging.getLogger("compound.roadmap")

DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

PALETTE = ["#22c55e", "#8b5cf6", "#6366f1", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#0ea5e9"]

MAX_TRACKS = 10


class RoadmapError(Exception):
    pass


MATERIAL_SHAPE = """{
          "title": "Specific resource or concept title",
          "url": "https://real-public-url-to-a-real-resource",
          "block_label": "Track · Phase or Topic",
          "type": "reading|video|practice|project|course",
          "estimated_minutes": 25,
          "priority_percent": 10,
          "cognitive_cost_multiplier": 1.0,
          "sequence": 1,
          "notes": "2-4 line study brief: WATCH/READ, then DO concrete steps."
        }"""

SYSTEM_PROMPT = f"""You are an expert curriculum designer for an advanced spaced-repetition \
learning platform (FSRS-6). The learner tells you what they want to master and how much time \
they have each week. You design a complete, opinionated study roadmap.

Return ONLY valid JSON (no prose, no markdown fences) matching this exact shape:

{{
  "version": "1.0",
  "tracks": [
    {{
      "slug": "kebab-case-unique-id",
      "name": "Human Readable Track Name",
      "description": "One sentence on what this track covers.",
      "color": "#22c55e",
      "cognitive_multiplier": 1.2,
      "materials": [
        {MATERIAL_SHAPE}
      ]
    }}
  ],
  "weekly_schedule": {{
    "monday": [{{"block": 1, "track": "slug"}}],
    "tuesday": [], "wednesday": [], "thursday": [],
    "friday": [], "saturday": [], "sunday": [{{"block": 1, "track": "review"}}]
  }}
}}

Rules:
- Create ONE track per distinct goal the learner names. If they name 4 things, make 4 tracks.
- Each track: 6–10 materials ordered by `sequence`, progressing beginner → advanced.
- Use REAL, well-known, free or freemium resources with working public URLs \
(official docs, MIT OCW, freeCodeCamp, Khan Academy, arXiv, YouTube, GitHub repos, \
university course pages). Never invent fake URLs. Prefer URLs from RESEARCH CONTEXT when given.
- `priority_percent`: lower = more foundational (1–15), up to 80 for optional depth.
- `cognitive_multiplier` per track: 1.0 easy, up to 1.5 for dense math/theory.
- `estimated_minutes`: realistic per-item study time (10–60).
- `weekly_schedule`: spread tracks across days. Include a light "review" block on Sunday \
(track value "review"). Each day has 1–3 blocks. Respect the weekly hour budget.
- Slugs must be unique, lowercase, kebab-case.
"""

TRACK_PLAN_PROMPT = """You are an expert curriculum designer. Return ONLY valid JSON (no markdown):

{
  "tracks": [
    {
      "slug": "kebab-case-id",
      "name": "Track Name",
      "description": "One sentence scope.",
      "color": "#22c55e",
      "cognitive_multiplier": 1.2
    }
  ]
}

Rules:
- ONE track per distinct learning goal in the learner's request.
- Maximum """ + str(MAX_TRACKS) + """ tracks. Merge related sub-goals into one track if needed.
- Do NOT include materials — only track metadata.
- Slugs: unique, lowercase, kebab-case.
"""

TRACK_MATERIALS_PROMPT = f"""You are an expert curriculum designer. Return ONLY valid JSON:

{{
  "materials": [
    {MATERIAL_SHAPE}
  ]
}}

Rules:
- Produce 6–8 materials for THIS track only, ordered by sequence (beginner → advanced).
- Use RESEARCH CONTEXT below for real GitHub repos, docs, and courses when relevant.
- Never invent fake URLs. Use canonical site roots if unsure of exact deep links.
- `block_label` should reference the track name and topic phase.
"""

SCHEDULE_PROMPT = """You are an expert curriculum designer. Return ONLY valid JSON:

{
  "weekly_schedule": {
    "monday": [{"block": 1, "track": "slug"}],
    "tuesday": [], "wednesday": [], "thursday": [],
    "friday": [], "saturday": [], "sunday": [{"block": 1, "track": "review"}]
  }
}

Rules:
- Use ONLY the track slugs provided (plus "review" on Sunday).
- Spread tracks across the week based on weekly hours. Heavier tracks earlier in the week.
- Each day: 0–3 blocks. Always include a light review block on Sunday.
"""


def _build_user_prompt(goals: str, weekly_hours: int, level: str | None) -> str:
    level_line = f"Current level: {level}.\n" if level else ""
    return (
        f"My learning goals:\n{goals}\n\n"
        f"{level_line}"
        f"I can study about {weekly_hours} hours per week.\n\n"
        "Design my complete roadmap now as JSON only."
    )


def _repair_json_text(text: str) -> str:
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    return text


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    candidates = [text, _repair_json_text(text)]
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        chunk = text[start : end + 1]
        candidates.extend([chunk, _repair_json_text(chunk)])

    last_error: json.JSONDecodeError | None = None
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError as e:
            last_error = e
            continue
    if last_error:
        raise last_error
    raise json.JSONDecodeError("No JSON object found", text, 0)


def _normalize(data: dict[str, Any]) -> dict[str, Any]:
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
        track["color"] = track.get("color") or PALETTE[i % len(PALETTE)]
        try:
            track["cognitive_multiplier"] = float(track.get("cognitive_multiplier", 1.0))
        except (TypeError, ValueError):
            track["cognitive_multiplier"] = 1.0
        track["is_system"] = False

        materials = track.get("materials") or []
        for j, m in enumerate(materials):
            m.setdefault("title", f"Concept {j+1}")
            m.setdefault("sequence", j + 1)
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


def _invoke_llm(system: str, user_prompt: str, max_tokens: int) -> tuple[str, str | None]:
    """Call the configured provider. Returns (text, finish_reason)."""
    provider = settings.ai_provider

    if provider == "anthropic":
        from anthropic import Anthropic

        client = Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model=settings.ai_model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = "".join(b.text for b in resp.content if b.type == "text")
        stop = getattr(resp, "stop_reason", None)
        return text, str(stop) if stop else None

    if provider == "openai":
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model=settings.ai_model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
        choice = resp.choices[0]
        finish = getattr(choice, "finish_reason", None)
        return choice.message.content or "", str(finish) if finish else None

    if provider == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        resp = client.models.generate_content(
            model=settings.ai_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=max_tokens,
                temperature=0.5,
                response_mime_type="application/json",
            ),
        )
        candidate = resp.candidates[0] if resp.candidates else None
        finish = getattr(candidate, "finish_reason", None) if candidate else None
        return resp.text or "", str(finish) if finish else None

    raise RoadmapError(f"Unknown AI provider: {provider}")


def _is_truncated(finish: str | None) -> bool:
    if not finish:
        return False
    f = finish.upper()
    return "MAX_TOKENS" in f or f in ("LENGTH", "MAX_OUTPUT_TOKENS")


def _call_model_json(system: str, user_prompt: str, *, max_tokens: int | None = None) -> dict[str, Any]:
    tokens = max_tokens or max(settings.ai_max_tokens, 8192)
    try:
        raw, finish = _invoke_llm(system, user_prompt, tokens)
    except Exception as e:
        logger.exception("Roadmap model call failed")
        raise RoadmapError(f"AI request failed: {e}") from e

    if not raw.strip():
        raise RoadmapError("The AI returned an empty response. Try again.")
    if _is_truncated(finish):
        raise RoadmapError("__truncated__")

    try:
        return _extract_json(raw)
    except json.JSONDecodeError as e:
        logger.warning("JSON parse failed: %s\nRaw: %s", e, raw[:600])
        raise RoadmapError("Could not parse the generated roadmap. Try rephrasing your goals.") from e


def _generate_single_pass(goals: str, weekly_hours: int, level: str | None) -> dict[str, Any]:
    user_prompt = _build_user_prompt(goals, weekly_hours, level)
    max_tokens = max(settings.ai_max_tokens, 16384)
    raw, finish = _invoke_llm(SYSTEM_PROMPT, user_prompt, max_tokens)
    if not raw.strip():
        raise RoadmapError("The AI returned an empty response. Try again.")
    if _is_truncated(finish):
        raise RoadmapError("__truncated__")
    data = _extract_json(raw)
    data = _normalize(data)
    if not data.get("tracks"):
        raise RoadmapError("The generated roadmap had no tracks. Try a more specific goal.")
    return data


def _generate_chunked(goals: str, weekly_hours: int, level: str | None) -> dict[str, Any]:
    """Multi-pass generation: track plan → materials per track (with research) → schedule."""
    logger.info("Using chunked roadmap generation for large/complex goals")
    level_line = f"Current level: {level}.\n" if level else ""
    plan_prompt = (
        f"My learning goals:\n{goals}\n\n{level_line}"
        f"I can study about {weekly_hours} hours per week.\n\n"
        "Design the track outline now as JSON only."
    )
    plan = _call_model_json(TRACK_PLAN_PROMPT, plan_prompt, max_tokens=4096)
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
            mat_data = _call_model_json(TRACK_MATERIALS_PROMPT, materials_prompt, max_tokens=8192)
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
        sched_data = _call_model_json(SCHEDULE_PROMPT, schedule_prompt, max_tokens=2048)
        schedule = sched_data.get("weekly_schedule") or {}
    except RoadmapError:
        schedule = _default_schedule(slugs)

    data = _normalize({"version": "1.0", "tracks": tracks, "weekly_schedule": schedule})
    if not data.get("tracks"):
        raise RoadmapError("Could not generate a roadmap. Try again.")
    return data


def _default_schedule(slugs: list[str]) -> dict[str, list[dict[str, Any]]]:
    """Simple round-robin fallback when schedule generation fails."""
    schedule: dict[str, list[dict[str, Any]]] = {d: [] for d in DAY_KEYS}
    weekdays = DAY_KEYS[:6]
    for i, slug in enumerate(slugs):
        day = weekdays[i % len(weekdays)]
        schedule[day].append({"block": len(schedule[day]) + 1, "track": slug})
    schedule["sunday"] = [{"block": 1, "track": "review"}]
    return schedule


def _should_chunk_first(goals: str) -> bool:
    """Heuristic: ambitious multi-goal requests benefit from chunked generation."""
    if len(goals) > 400:
        return True
    goal_markers = len(re.findall(r"[,;\n]|\band\b|\bor\b", goals, re.I))
    return goal_markers >= 4


def generate_roadmap(goals: str, weekly_hours: int = 10, level: str | None = None) -> dict[str, Any]:
    """Generate and normalize a curriculum dict from free-text goals."""
    if not settings.ai_enabled:
        raise RoadmapError(
            "AI is not configured. Set the API key for your provider to generate roadmaps."
        )
    if not goals or not goals.strip():
        raise RoadmapError("Please describe what you want to learn.")

    if _should_chunk_first(goals):
        return _generate_chunked(goals, weekly_hours, level)

    last_error: RoadmapError | None = None
    for attempt in range(2):
        try:
            return _generate_single_pass(goals, weekly_hours, level)
        except json.JSONDecodeError as e:
            logger.warning("Single-pass JSON parse failed (attempt %d): %s", attempt + 1, e)
            last_error = RoadmapError("Could not parse the generated roadmap. Try rephrasing your goals.")
        except RoadmapError as e:
            if str(e) == "__truncated__":
                logger.info("Single-pass truncated — falling back to chunked generation")
                try:
                    return _generate_chunked(goals, weekly_hours, level)
                except RoadmapError as chunk_err:
                    last_error = chunk_err
                    break
            last_error = e

    if last_error and str(last_error) != "__truncated__":
        raise last_error
    raise RoadmapError("Could not generate a roadmap. Try again.")
