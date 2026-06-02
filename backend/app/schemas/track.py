from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TrackCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    cognitive_multiplier: float = Field(default=1.0, gt=0.0)
    is_public: bool = True


class TrackUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    cognitive_multiplier: float | None = Field(default=None, gt=0.0)
    is_public: bool | None = None
    is_featured: bool | None = None


class TrackResponse(BaseModel):
    id: UUID
    user_id: UUID
    slug: str
    name: str
    description: str | None
    color: str
    cognitive_multiplier: float
    is_system: bool
    is_public: bool
    is_featured: bool
    star_count: int
    adoption_count: int
    rating_count: int
    rating_avg: float
    quality_score: float
    source_track_id: UUID | None
    generation_prompt: str | None
    created_at: datetime
    material_count: int = 0
    due_card_count: int = 0

    model_config = {"from_attributes": True}


class TrackProgressBlock(BaseModel):
    label: str
    material_count: int
    started_count: int
    mastered_count: int


class TrackProgressResponse(BaseModel):
    track_id: UUID
    slug: str
    name: str
    color: str
    materials_total: int
    materials_started: int
    materials_mastered: int
    due_reviews: int
    avg_retrievability: float
    next_material_id: UUID | None = None
    next_material_title: str | None = None
    next_material_url: str | None = None
    next_block_label: str | None = None
    blocks: list[TrackProgressBlock]
