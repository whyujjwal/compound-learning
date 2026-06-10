from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.gamification import AchievementView
from app.schemas.queue import QueueItem


class BlockSessionResponse(BaseModel):
    id: UUID
    session_date: date
    slot: int
    slot_label: str
    track_slug: str
    track_name: str
    track_color: str
    planned_minutes: int
    current_index: int
    total_items: int
    status: str
    started_at: datetime
    completed_at: datetime | None
    items: list[QueueItem]
    active_card_id: UUID | None
    # Gamification deltas from the just-submitted review (empty on plain fetches).
    xp_total: int = 0
    level: int = 1
    newly_unlocked: list[AchievementView] = []


class BlockReviewSubmit(BaseModel):
    rating: str
    elapsed_time_seconds: int = 0
