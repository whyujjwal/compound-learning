from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.card import CardState
from app.models.review_log import ReviewRating
from app.schemas.gamification import AchievementView


class CardResponse(BaseModel):
    id: UUID
    user_id: UUID
    material_id: UUID
    state: CardState
    difficulty: float
    stability: float
    retrievability: float
    reps: int
    lapses: int
    last_reviewed_at: datetime | None
    due_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewLogResponse(BaseModel):
    id: UUID
    rating: ReviewRating
    elapsed_time_seconds: int
    actual_interval_days: int
    scheduled_interval_days: int
    reviewed_at: datetime

    model_config = {"from_attributes": True}


class CardDetailResponse(CardResponse):
    material_title: str
    material_content: str | None
    material_url: str | None
    track_id: UUID
    track_name: str
    track_color: str
    review_logs: list[ReviewLogResponse] = []


class ReviewSubmit(BaseModel):
    rating: ReviewRating
    elapsed_time_seconds: int = Field(default=0, ge=0)


class ReviewResponse(BaseModel):
    card: CardResponse
    scheduled_interval_days: int
    actual_interval_days: int
    # Gamification: lets the UI update the level ring and celebrate unlocks live.
    xp_total: int = 0
    level: int = 1
    newly_unlocked: list[AchievementView] = []
