from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str | None = None
    target_retention: float
    daily_study_minutes: int
    paused_tracks: list[str] = []
    milestone_title: str | None = None
    milestone_date: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    target_retention: float | None = Field(default=None, gt=0.0, lt=1.0)
    daily_study_minutes: int | None = Field(default=None, ge=15, le=720)
    paused_tracks: list[str] | None = None
    display_name: str | None = None
    milestone_title: str | None = None
    milestone_date: datetime | None = None
