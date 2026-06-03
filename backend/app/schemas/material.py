from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MaterialUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    raw_content: str | None = None
    external_url: str | None = None
    block_label: str | None = None
    resource_type: str | None = None
    sequence: int | None = None
    cognitive_cost_multiplier: float | None = Field(default=None, gt=0.0)
    estimated_minutes: int | None = Field(default=None, ge=1, le=480)
    priority_percent: int | None = Field(default=None, ge=0, le=100)
    prerequisite_material_id: UUID | None = None
    module_id: UUID | None = None
    difficulty: str | None = None


class MaterialCreate(BaseModel):
    track_id: UUID
    module_id: UUID | None = None
    title: str = Field(min_length=1, max_length=500)
    raw_content: str | None = None
    external_url: str | None = None
    block_label: str | None = None
    resource_type: str | None = None
    sequence: int = 0
    cognitive_cost_multiplier: float = Field(default=1.0, gt=0.0)
    estimated_minutes: int = Field(default=15, ge=1, le=480)
    priority_percent: int = Field(default=50, ge=0, le=100)
    prerequisite_material_id: UUID | None = None
    difficulty: str | None = None
    create_card: bool = True


class MaterialResponse(BaseModel):
    id: UUID
    track_id: UUID
    module_id: UUID | None = None
    title: str
    raw_content: str | None
    external_url: str | None
    block_label: str | None
    resource_type: str | None
    difficulty: str | None = None
    sequence: int
    cognitive_cost_multiplier: float
    estimated_minutes: int
    priority_percent: int
    prerequisite_material_id: UUID | None
    created_at: datetime
    card_id: UUID | None = None
    card_state: str | None = None
    card_due_at: datetime | None = None

    model_config = {"from_attributes": True}
