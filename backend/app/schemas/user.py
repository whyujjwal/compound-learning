from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str | None = None
    target_retention: float
    daily_study_minutes: int
    daily_new_cards: int = 0
    paused_tracks: list[str] = []
    milestone_title: str | None = None
    milestone_date: datetime | None = None
    learning_goals: str | None = None
    onboarded: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    target_retention: float | None = Field(default=None, gt=0.0, lt=1.0)
    daily_study_minutes: int | None = Field(default=None, ge=15, le=720)
    daily_new_cards: int | None = Field(default=None, ge=0, le=200)
    paused_tracks: list[str] | None = None
    weekly_schedule: dict | None = None
    display_name: str | None = None
    milestone_title: str | None = None
    milestone_date: datetime | None = None
    learning_goals: str | None = None
    onboarded: bool | None = None
