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
    learning_outcomes: list[str] | None = None
    prerequisites: list[str] | None = None
    target_audience: str | None = None
    estimated_hours: int | None = Field(default=None, ge=1, le=5000)
    difficulty: str | None = None
    syllabus_summary: str | None = None


class TrackUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    cognitive_multiplier: float | None = Field(default=None, gt=0.0)
    is_public: bool | None = None
    is_featured: bool | None = None
    learning_outcomes: list[str] | None = None
    prerequisites: list[str] | None = None
    target_audience: str | None = None
    estimated_hours: int | None = Field(default=None, ge=1, le=5000)
    difficulty: str | None = None
    syllabus_summary: str | None = None


class TrackSyllabusMaterial(BaseModel):
    id: UUID
    title: str
    external_url: str | None = None
    resource_type: str | None = None
    estimated_minutes: int
    sequence: int
    difficulty: str | None = None
    resource_quality_score: float = 0.0
    card_state: str | None = None


class TrackSyllabusModule(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    objective: str
    sequence: int
    estimated_minutes: int
    difficulty: str
    quiz_prompt: str | None = None
    project_prompt: str | None = None
    material_count: int
    started_count: int = 0
    mastered_count: int = 0
    materials: list[TrackSyllabusMaterial] = []


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
    learning_outcomes: list[str] = []
    prerequisites: list[str] = []
    target_audience: str | None = None
    estimated_hours: int | None = None
    difficulty: str | None = None
    syllabus_summary: str | None = None
    modules: list[TrackSyllabusModule] = []
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
    modules: list[TrackSyllabusModule] = []
