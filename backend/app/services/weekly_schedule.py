"""Single source of truth for the weekly block schedule.

Loaded from docs/curriculum.json weekly_schedule. Used by queue builder and API.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from app.models.user import User
from app.schemas.curriculum import BlockScheduleItem, WeeklySchedule
from app.services.curriculum_loader import load_file
from app.services.timezone import local_weekday

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


def empty_weekly_schedule() -> WeeklySchedule:
    return WeeklySchedule.model_validate({day: [] for day in DAY_KEYS})


@lru_cache(maxsize=1)
def load_weekly_schedule_model() -> WeeklySchedule | None:
    if not DEFAULT_PATH.exists():
        return None
    data = load_file(DEFAULT_PATH)
    raw = data.get("weekly_schedule")
    if not raw:
        return None
    return WeeklySchedule.model_validate(raw)


def schedule_for_user(user: User | None) -> WeeklySchedule | None:
    """Prefer the user's personalized schedule.

    Logged-in learners start from a blank canvas, so no per-user schedule means
    an empty week. The bundled four-track schedule is only used when imported as
    examples or in non-user fallback paths.
    """
    if user is not None and getattr(user, "weekly_schedule", None):
        try:
            return WeeklySchedule.model_validate(user.weekly_schedule)
        except Exception:
            pass
    if user is not None:
        return empty_weekly_schedule()
    return load_weekly_schedule_model()


def track_slugs_for_weekday(weekday: int, user: User | None = None) -> list[str]:
    """Return ordered track slugs for a weekday (Mon=0 … Sun=6)."""
    return [b.track for b in blocks_for_weekday(weekday, user)]


def blocks_for_weekday(weekday: int, user: User | None = None) -> list[BlockScheduleItem]:
    """Return ordered blocks for a weekday (Mon=0 … Sun=6), preserving per-block
    minutes so the queue builder can honor learner-defined block lengths."""
    schedule = schedule_for_user(user)
    if schedule is None:
        return [
            BlockScheduleItem(block=i + 1, track=slug)
            for i, slug in enumerate(_FALLBACK_TEMPLATE.get(weekday, []))
        ]
    key = DAY_KEYS[weekday]
    return list(getattr(schedule, key, []))


def today_block_items(
    user: User | None = None,
    timezone_name: str | None = None,
) -> list[BlockScheduleItem]:
    schedule = schedule_for_user(user)
    weekday = local_weekday(timezone_name, user)
    if schedule is None:
        return [
            BlockScheduleItem(
                block=i + 1,
                track=slug,
                track_name=TRACK_NAMES.get(slug, slug),
            )
            for i, slug in enumerate(_FALLBACK_TEMPLATE.get(weekday, []))
        ]
    key = DAY_KEYS[weekday]
    blocks = getattr(schedule, key, [])
    return [
        BlockScheduleItem(
            block=b.block,
            track=b.track,
            track_name=b.track_name or TRACK_NAMES.get(b.track, b.track),
        )
        for b in blocks
    ]


def invalidate_schedule_cache() -> None:
    load_weekly_schedule_model.cache_clear()
