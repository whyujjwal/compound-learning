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
    materials_started: int = 0
    materials_mastered: int = 0
    reviews_today: int
    reviews_this_week: int
    reviews_total: int
    sessions_this_week: int = 0
    days_active_30d: int = 0
    total_minutes_invested: int = 0
    minutes_today: int = 0
    daily_goal_minutes: int = 120
    retention_rate: float
    current_streak: int
    longest_streak: int
    streak_freeze_remaining: int = 1
    avg_review_seconds: float
    # Gamification summary (full breakdown lives at /api/gamification/profile).
    xp_total: int = 0
    level: int = 1
    level_xp_into: int = 0
    level_xp_span: int = 100
    achievements_unlocked: int = 0
    track_breakdown: list[TrackStats]
