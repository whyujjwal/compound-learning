"""Single source of truth for the weekly block schedule.

Loaded from docs/curriculum.json weekly_schedule. Used by queue builder and API.
"""

from __future__ import annotations

from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

from app.schemas.curriculum import BlockScheduleItem, WeeklySchedule
from app.services.curriculum_loader import load_file

DEFAULT_PATH = Path(__file__).resolve().parents[3] / "docs" / "curriculum.json"
DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
TRACK_NAMES = {
    "dsa": "Data Structures & Algorithms",
    "ai-math": "Mathematics for AI",
    "llm-ml": "LLM & Machine Learning",
    "system-design": "System Design",
    "review": "Review Pass",
}

# Fallback when curriculum.json is missing (matches bundled curriculum).
_FALLBACK_TEMPLATE: dict[int, list[str]] = {
    0: ["dsa", "ai-math"],
    1: ["dsa", "llm-ml"],
    2: ["dsa", "system-design"],
    3: ["ai-math", "llm-ml"],
    4: ["dsa", "system-design"],
    5: ["dsa", "ai-math", "llm-ml", "system-design"],
    6: ["dsa", "ai-math", "llm-ml", "system-design"],
}


@lru_cache(maxsize=1)
def load_weekly_schedule_model() -> WeeklySchedule | None:
    if not DEFAULT_PATH.exists():
        return None
    data = load_file(DEFAULT_PATH)
    raw = data.get("weekly_schedule")
    if not raw:
        return None
    return WeeklySchedule.model_validate(raw)


def track_slugs_for_weekday(weekday: int) -> list[str]:
    """Return ordered track slugs for a weekday (Mon=0 … Sun=6)."""
    schedule = load_weekly_schedule_model()
    if schedule is None:
        return _FALLBACK_TEMPLATE.get(weekday, [])
    key = DAY_KEYS[weekday]
    blocks = getattr(schedule, key, [])
    return [b.track for b in blocks]


def today_block_items() -> list[BlockScheduleItem]:
    schedule = load_weekly_schedule_model()
    if schedule is None:
        weekday = datetime.now(UTC).weekday()
        return [
            BlockScheduleItem(
                block=i + 1,
                track=slug,
                track_name=TRACK_NAMES.get(slug, slug),
            )
            for i, slug in enumerate(_FALLBACK_TEMPLATE.get(weekday, []))
        ]
    key = DAY_KEYS[datetime.now(UTC).weekday()]
    blocks = getattr(schedule, key, [])
    return [
        BlockScheduleItem(
            block=b.block,
            track=b.track,
            track_name=TRACK_NAMES.get(b.track, b.track),
        )
        for b in blocks
    ]


def invalidate_schedule_cache() -> None:
    load_weekly_schedule_model.cache_clear()
