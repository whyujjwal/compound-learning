from uuid import UUID

from pydantic import BaseModel


class BlockScheduleItem(BaseModel):
    block: int
    track: str
    track_name: str | None = None
    # Per-block time budget in minutes. None = fall back to the user's daily block size.
    minutes: int | None = None


class WeeklySchedule(BaseModel):
    monday: list[BlockScheduleItem]
    tuesday: list[BlockScheduleItem]
    wednesday: list[BlockScheduleItem]
    thursday: list[BlockScheduleItem]
    friday: list[BlockScheduleItem]
    saturday: list[BlockScheduleItem]
    sunday: list[BlockScheduleItem]


class BlockSummary(BaseModel):
    label: str
    material_count: int
    started_count: int = 0
    mastered_count: int = 0
    next_material: str | None = None
    next_url: str | None = None


class TrackCurriculumSummary(BaseModel):
    id: UUID
    slug: str
    name: str
    color: str
    description: str | None
    material_count: int
    card_count: int
    started_count: int = 0
    mastered_count: int = 0
    due_review_count: int = 0
    next_material: str | None = None
    next_block_label: str | None = None
    blocks: list[BlockSummary]


class CurriculumOverview(BaseModel):
    version: str | None
    total_materials: int
    total_cards: int
    total_started: int = 0
    total_mastered: int = 0
    due_reviews: int = 0
    weekly_schedule: WeeklySchedule | None
    today_blocks: list[BlockScheduleItem]
    tracks: list[TrackCurriculumSummary]
