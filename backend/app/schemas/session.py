from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.study_session import CompletionStatus


class StudySessionCreate(BaseModel):
    material_id: UUID
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=0, le=600)
    completion_status: CompletionStatus = CompletionStatus.COMPLETED
    self_rating: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None
    external_evidence_url: str | None = None


class StudySessionUpdate(BaseModel):
    ended_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=0, le=600)
    completion_status: CompletionStatus | None = None
    self_rating: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None
    external_evidence_url: str | None = None


class StudySessionResponse(BaseModel):
    id: UUID
    material_id: UUID
    material_title: str | None = None
    started_at: datetime
    ended_at: datetime | None
    duration_minutes: int | None
    completion_status: CompletionStatus
    self_rating: int | None
    notes: str | None
    external_evidence_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
