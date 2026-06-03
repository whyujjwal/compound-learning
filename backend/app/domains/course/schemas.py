"""Canonical course-tree and roadmap schemas (3-level structure)."""

from uuid import UUID

from pydantic import BaseModel, Field


class CourseMaterial(BaseModel):
    id: UUID
    title: str
    resource_type: str | None = None
    external_url: str | None = None
    has_content: bool = False
    provider: str | None = None
    author: str | None = None
    license: str | None = None
    kind: str = "core"
    label: str | None = None
    difficulty: str | None = None
    estimated_minutes: int
    priority_percent: int
    sequence: int
    resource_quality_score: float = 0.0
    resource_health_status: str = "UNKNOWN"
    card_state: str | None = None
    started: bool = False
    mastered: bool = False


class CourseSection(BaseModel):
    id: UUID
    title: str
    objective: str | None = None
    label: str | None = None
    kind: str = "core"
    learning_outcomes: list[str] = Field(default_factory=list)
    sequence: int
    estimated_minutes: int
    material_count: int
    started_count: int
    mastered_count: int
    materials: list[CourseMaterial] = Field(default_factory=list)


class CourseModule(BaseModel):
    id: UUID
    title: str
    objective: str | None = None
    label: str | None = None
    kind: str = "core"
    learning_outcomes: list[str] = Field(default_factory=list)
    sequence: int
    estimated_minutes: int
    difficulty: str | None = None
    material_count: int
    started_count: int
    mastered_count: int
    sections: list[CourseSection] = Field(default_factory=list)


class CourseTree(BaseModel):
    id: UUID
    slug: str
    name: str
    summary: str | None = None
    color: str
    difficulty: str | None = None
    estimated_hours: int | None = None
    outcomes: list[str] = Field(default_factory=list)
    prerequisites: list[str] = Field(default_factory=list)
    version: int
    module_count: int
    material_count: int
    mastered_count: int
    modules: list[CourseModule] = Field(default_factory=list)


class RoadmapNode(BaseModel):
    id: str
    type: str  # "module" | "section" | "material"
    parent_id: str | None = None
    title: str
    kind: str = "core"
    label: str | None = None
    resource_type: str | None = None
    status: str = "not_started"  # "not_started" | "started" | "mastered"
    external_url: str | None = None
    estimated_minutes: int = 0


class RoadmapEdge(BaseModel):
    id: str
    source: str
    target: str
    kind: str = "primary"  # "primary" | "requires" | "recommends" | "related"


class RoadmapGraph(BaseModel):
    syllabus_id: UUID
    slug: str
    name: str
    color: str
    nodes: list[RoadmapNode] = Field(default_factory=list)
    edges: list[RoadmapEdge] = Field(default_factory=list)
