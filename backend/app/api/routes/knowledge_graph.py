from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.user import User
from app.schemas.knowledge_graph import GraphEdge, GraphNode, KnowledgeGraphResponse
from app.services.mastery import is_mastered

router = APIRouter(prefix="/knowledge-graph", tags=["knowledge-graph"])

LEECH_LAPSES = 5


@router.get("/track/{slug}", response_model=KnowledgeGraphResponse)
def track_knowledge_graph(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> KnowledgeGraphResponse:
    track = db.query(Track).filter(Track.user_id == user.id, Track.slug == slug).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    materials = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id)
        .order_by(StudyMaterial.sequence.asc())
        .all()
    )
    cards = (
        db.query(Card)
        .join(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id, Card.user_id == user.id)
        .all()
    )
    card_by_material = {c.material_id: c for c in cards}

    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    for m in materials:
        card = card_by_material.get(m.id)
        nodes.append(
            GraphNode(
                id=m.id,
                title=m.title,
                block_label=m.block_label,
                sequence=m.sequence,
                mastered=bool(card and is_mastered(card)),
                started=bool(card and card.reps > 0),
                lapses=card.lapses if card else 0,
                is_leech=bool(card and card.lapses >= LEECH_LAPSES),
                card_id=card.id if card else None,
            )
        )
        if m.prerequisite_material_id:
            edges.append(GraphEdge(source=m.prerequisite_material_id, target=m.id))

    return KnowledgeGraphResponse(
        track_slug=track.slug,
        track_name=track.name,
        nodes=nodes,
        edges=edges,
    )


@router.get("/leeches", response_model=list[GraphNode])
def list_leeches(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[GraphNode]:
    cards = (
        db.query(Card)
        .options(joinedload(Card.material))
        .filter(Card.user_id == user.id, Card.lapses >= LEECH_LAPSES)
        .order_by(Card.lapses.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        GraphNode(
            id=c.material_id,
            title=c.material.title,
            block_label=c.material.block_label,
            sequence=c.material.sequence,
            mastered=is_mastered(c),
            started=c.reps > 0,
            lapses=c.lapses,
            is_leech=True,
            card_id=c.id,
        )
        for c in cards
    ]
