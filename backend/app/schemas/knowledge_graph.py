from uuid import UUID

from pydantic import BaseModel


class GraphNode(BaseModel):
    id: UUID
    title: str
    block_label: str | None
    sequence: int
    mastered: bool
    started: bool
    lapses: int = 0
    is_leech: bool = False
    card_id: UUID | None = None


class GraphEdge(BaseModel):
    source: UUID
    target: UUID


class KnowledgeGraphResponse(BaseModel):
    track_slug: str
    track_name: str
    nodes: list[GraphNode]
    edges: list[GraphEdge]
