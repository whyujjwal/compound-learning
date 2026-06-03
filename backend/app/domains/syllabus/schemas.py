"""Syllabus domain schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SyllabusCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=1, max_length=200)
    summary: str | None = None
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    visibility: str = Field(default="PRIVATE", pattern=r"^(PUBLIC|PRIVATE)$")
    learning_outcomes: list[str] | None = None
    prerequisites: list[str] | None = None
    target_audience: str | None = None
    estimated_hours: int | None = Field(default=None, ge=1, le=5000)
    difficulty: str | None = None


class SyllabusUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    visibility: str | None = Field(default=None, pattern=r"^(PUBLIC|PRIVATE)$")
    learning_outcomes: list[str] | None = None
    prerequisites: list[str] | None = None
    target_audience: str | None = None
    estimated_hours: int | None = Field(default=None, ge=1, le=5000)
    difficulty: str | None = None


class SyllabusMaterialSummary(BaseModel):
    id: UUID
    title: str
    external_url: str | None = None
    resource_type: str | None = None
    estimated_minutes: int
    sequence: int
    difficulty: str | None = None
    resource_quality_score: float = 0.0
    card_state: str | None = None


class SyllabusModuleSummary(BaseModel):
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
    materials: list[SyllabusMaterialSummary] = []


class SyllabusPermissions(BaseModel):
    can_edit: bool
    can_publish: bool


class SyllabusListItem(BaseModel):
    id: UUID
    slug: str
    name: str
    summary: str | None
    color: str
    visibility: str
    module_count: int
    material_count: int
    started_count: int
    mastered_count: int
    due_review_count: int
    health_score: int
    updated_at: datetime


class SyllabusDetail(BaseModel):
    id: UUID
    slug: str
    name: str
    summary: str | None
    color: str
    visibility: str
    outcomes: list[str]
    modules: list[SyllabusModuleSummary]
    version: int
    permissions: SyllabusPermissions


class SyllabusModuleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    objective: str | None = None
    sequence: int | None = None
    estimated_minutes: int | None = Field(default=None, ge=0, le=10000)
    difficulty: str | None = None


class SyllabusModuleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    objective: str | None = None
    sequence: int | None = None
    estimated_minutes: int | None = Field(default=None, ge=0, le=10000)
    difficulty: str | None = None


class SyllabusMaterialCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    module_id: UUID | None = None
    raw_content: str | None = None
    external_url: str | None = None
    block_label: str | None = None
    resource_type: str | None = None
    sequence: int | None = None
    estimated_minutes: int = Field(default=15, ge=1, le=480)
    priority_percent: int = Field(default=50, ge=0, le=100)
    difficulty: str | None = None
    create_card: bool = True


class SyllabusMaterialUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    module_id: UUID | None = None
    raw_content: str | None = None
    external_url: str | None = None
    block_label: str | None = None
    resource_type: str | None = None
    sequence: int | None = None
    estimated_minutes: int | None = Field(default=None, ge=1, le=480)
    priority_percent: int | None = Field(default=None, ge=0, le=100)
    difficulty: str | None = None


class SyllabusReorderItem(BaseModel):
    id: UUID
    sequence: int = Field(ge=0)


class SyllabusReorderRequest(BaseModel):
    modules: list[SyllabusReorderItem] | None = None
    materials: list[SyllabusReorderItem] | None = None


class ProposalOperationTarget(BaseModel):
    syllabus_id: UUID | None = None
    module_id: UUID | None = None
    material_id: UUID | None = None


class ProposalOperation(BaseModel):
    id: str
    type: str
    target: ProposalOperationTarget
    payload: dict = Field(default_factory=dict)
    before: dict | None = None
    reason: str | None = None
    risk: str = "low"


class ProposalCreate(BaseModel):
    source: str = Field(default="MANUAL", pattern=r"^(AI|MANUAL|IMPORT|SYSTEM)$")
    instruction: str | None = None
    summary: str | None = None
    operations: list[ProposalOperation] = Field(default_factory=list)


class ProposalAIRequest(BaseModel):
    instruction: str = Field(min_length=3, max_length=4000)


class ProposalApplyRequest(BaseModel):
    operation_ids: list[str] | None = None
    force: bool = False


class SyllabusMaterialListResponse(BaseModel):
    items: list[SyllabusMaterialSummary]
    total: int
    limit: int
    offset: int


class ProposalResponse(BaseModel):
    id: UUID
    syllabus_id: UUID
    source: str
    status: str
    instruction: str | None
    summary: str | None
    base_version: int
    operations: list[ProposalOperation]
    selected_operation_ids: list[str] | None
    applied_operation_ids: list[str] | None
    error: str | None
    created_at: datetime
    updated_at: datetime
    applied_at: datetime | None


class ChangeLogEntry(BaseModel):
    id: UUID
    proposal_id: UUID | None
    operation_id: str | None
    operation_type: str
    before: dict | None
    after: dict | None
    created_at: datetime
