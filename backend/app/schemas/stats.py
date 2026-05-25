from uuid import UUID

from pydantic import BaseModel


class TrackStats(BaseModel):
    track_id: UUID
    track_name: str
    track_color: str
    material_count: int
    card_count: int
    due_count: int
    reviews_total: int


class StatsResponse(BaseModel):
    total_cards: int
    due_cards: int
    total_materials: int
    total_tracks: int
    reviews_today: int
    reviews_this_week: int
    reviews_total: int
    retention_rate: float
    current_streak: int
    longest_streak: int
    avg_review_seconds: float
    track_breakdown: list[TrackStats]
