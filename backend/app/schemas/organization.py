from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.organization import MemberRole


class OrganizationCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    created_at: datetime
    member_count: int = 0

    model_config = {"from_attributes": True}


class MemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    display_name: str | None
    role: MemberRole
    joined_at: datetime


class SharedCurriculumCreate(BaseModel):
    name: str
    curriculum_json: str


class SharedCurriculumResponse(BaseModel):
    id: UUID
    name: str
    organization_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
