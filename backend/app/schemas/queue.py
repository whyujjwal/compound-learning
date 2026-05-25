from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class QueueItem(BaseModel):
    card_id: UUID
    material_id: UUID
    material_title: str
    material_content: str | None = None
    material_url: str | None = None
    block_label: str | None = None
    resource_type: str | None = None
    sequence: int = 0
    track_id: UUID
    track_slug: str
    track_name: str
    track_color: str
    state: str
    due_at: datetime
    priority_percent: int
    estimated_minutes: int
    cognitive_cost: float
    difficulty: float | None = None
    stability: float | None = None
    retrievability: float | None = None
    # 'review' = FSRS-due (reps>0). 'new' = next-in-sequence (reps==0).
    kind: str = "new"


class BlockEntry(BaseModel):
    slot: int
    slot_label: str
    track_id: UUID
    track_slug: str
    track_name: str
    track_color: str
    block_minutes: int
    planned_minutes: int
    review_count: int
    new_count: int
    reviews: list[QueueItem]
    new_items: list[QueueItem]


class DailyQueueResponse(BaseModel):
    weekday: int  # 0=Mon ... 6=Sun
    block_minutes: int
    blocks: list[BlockEntry]
    # Flat list across blocks (review-session compatibility / heatmap counters)
    items: list[QueueItem]
    total_minutes: int
    review_count: int
    new_count: int
