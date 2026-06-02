"""AI-powered personalized roadmap generation.

Given a learner's free-text goals and weekly time budget, ask the configured AI
provider to produce a full curriculum JSON (tracks + materials with real,
high-quality internet resources + a weekly study schedule) that can be fed
straight into ``import_curriculum``.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.config import settings

logger = logging.getLogger("compound.roadmap")

DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

PALETTE = ["#22c55e", "#8b5cf6", "#6366f1", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#0ea5e9"]


class RoadmapError(Exception):
    pass


SYSTEM_PROMPT = """You are an expert curriculum designer for an advanced spaced-repetition \
learning platform (FSRS-6). The learner tells you what they want to master and how much time \
they have each week. You design a complete, opinionated study roadmap.

Return ONLY valid JSON (no prose, no markdown fences) matching this exact shape:

{
  "version": "1.0",
  "tracks": [
    {
      "slug": "kebab-case-unique-id",
      "name": "Human Readable Track Name",
      "description": "One sentence on what this track covers.",
      "color": "#22c55e",
      "cognitive_multiplier": 1.2,
      "materials": [
        {
          "title": "Specific resource or concept title",
          "url": "https://real-public-url-to-a-real-resource",
          "block_label": "Track · Phase or Topic",
          "type": "reading|video|practice|project|course",
          "estimated_minutes": 25,
          "priority_percent": 10,
          "cognitive_cost_multiplier": 1.0,
          "sequence": 1,
          "notes": "2-4 line study brief: WATCH/READ, then DO concrete steps."
        }
      ]
    }
  ],
  "weekly_schedule": {
    "monday": [{"block": 1, "track": "slug"}],
    "tuesday": [], "wednesday": [], "thursday": [],
    "friday": [], "saturday": [], "sunday": [{"block": 1, "track": "review"}]
  }
}

Rules:
- Create ONE track per distinct goal the learner names. If they name 4 things, make 4 tracks.
- Each track: 8–16 materials ordered by `sequence`, progressing beginner → advanced.
- Use REAL, well-known, free or freemium resources with working public URLs \
(official docs, MIT OCW, freeCodeCamp, Khan Academy, arXiv, YouTube channels like 3Blue1Brown / \
Andrej Karpathy, takeuforward, university course pages, classic textbooks' free pages). \
Never invent fake URLs. If unsure of an exact URL, use the canonical site root for that resource.
- `priority_percent`: lower = more foundational/critical (1–15 for must-know basics, up to 80 for \
optional depth). Prerequisites should have lower numbers than what builds on them.
- `cognitive_multiplier` per track: 1.0 easy, up to 1.5 for very dense math/theory.
- `estimated_minutes`: realistic per-item study time (10–60).
- `weekly_schedule`: spread the tracks across the days that fit the learner's weekly time. \
Heavier/denser tracks earlier in the week. Always include a light "review" block on Sunday \
(track value "review"). Each day has 1–3 blocks. Respect the weekly hour budget.
- Slugs must be unique, lowercase, kebab-case, derived from the track name.
"""


def _build_user_prompt(goals: str, weekly_hours: int, level: str | None) -> str:
    level_line = f"Current level: {level}.\n" if level else ""
    return (
        f"My learning goals:\n{goals}\n\n"
        f"{level_line}"
        f"I can study about {weekly_hours} hours per week.\n\n"
        "Design my complete roadmap now as JSON only."
    )


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    # Strip markdown fences if the model added them anyway.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Last resort: grab the outermost {...} block.
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _normalize(data: dict[str, Any]) -> dict[str, Any]:
    """Defensive cleanup so a slightly-off model response still imports cleanly."""
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


def _call_model(goals: str, weekly_hours: int, level: str | None) -> str:
    user_prompt = _build_user_prompt(goals, weekly_hours, level)
    provider = settings.ai_provider
    max_tokens = max(settings.ai_max_tokens, 8192)

    if provider == "anthropic":
        from anthropic import Anthropic

        client = Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model=settings.ai_model,
            max_tokens=max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(b.text for b in resp.content if b.type == "text")

    if provider == "openai":
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model=settings.ai_model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content or ""

    if provider == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        resp = client.models.generate_content(
            model=settings.ai_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=max_tokens,
                temperature=0.7,
                response_mime_type="application/json",
            ),
        )
        return resp.text or ""

    raise RoadmapError(f"Unknown AI provider: {provider}")


def generate_roadmap(goals: str, weekly_hours: int = 10, level: str | None = None) -> dict[str, Any]:
    """Generate and normalize a curriculum dict from free-text goals."""
    if not settings.ai_enabled:
        raise RoadmapError(
            "AI is not configured. Set the API key for your provider to generate roadmaps."
        )
    if not goals or not goals.strip():
        raise RoadmapError("Please describe what you want to learn.")

    raw = _call_model(goals, weekly_hours, level)
    if not raw.strip():
        raise RoadmapError("The AI returned an empty response. Try again.")
    try:
        data = _extract_json(raw)
    except json.JSONDecodeError as e:
        logger.warning("Roadmap JSON parse failed: %s\nRaw: %s", e, raw[:500])
        raise RoadmapError("Could not parse the generated roadmap. Try rephrasing your goals.")

    data = _normalize(data)
    if not data.get("tracks"):
        raise RoadmapError("The generated roadmap had no tracks. Try a more specific goal.")
    return data
