from datetime import date

from pydantic import BaseModel, Field


class RescheduleRequest(BaseModel):
    start_date: date
    hours_per_week: int | None = Field(default=None, ge=1, le=80)


class RescheduleResponse(BaseModel):
    start_date: date
    message: str
    adjusted_tracks: list[str]
