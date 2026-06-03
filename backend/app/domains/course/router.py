"""Read-only course-tree and roadmap endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.domains.course.roadmap_service import build_roadmap
from app.domains.course.schemas import CourseTree, RoadmapGraph
from app.domains.course.tree_service import build_course_tree
from app.models.track import Track
from app.models.user import User

router = APIRouter(prefix="/syllabi", tags=["course"])


def _resolve_track(db: Session, user: User, slug: str) -> Track:
    track = (
        db.query(Track)
        .filter(
            Track.slug == slug,
            or_(Track.user_id == user.id, Track.is_public.is_(True), Track.is_system.is_(True)),
        )
        .order_by((Track.user_id == user.id).desc())
        .first()
    )
    if not track:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return track


@router.get("/{slug}/tree", response_model=CourseTree)
def get_course_tree(slug: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> CourseTree:
    track = _resolve_track(db, user, slug)
    return build_course_tree(db, track, user.id)


@router.get("/{slug}/roadmap", response_model=RoadmapGraph)
def get_roadmap(slug: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> RoadmapGraph:
    from app.models.syllabus_edge import SyllabusEdge

    track = _resolve_track(db, user, slug)
    tree = build_course_tree(db, track, user.id)
    rows = db.query(SyllabusEdge).filter(SyllabusEdge.syllabus_id == track.id).all()
    extra = [
        {
            "id": r.id,
            "from_node_type": r.from_node_type,
            "from_node_id": r.from_node_id,
            "to_node_type": r.to_node_type,
            "to_node_id": r.to_node_id,
            "kind": r.kind,
        }
        for r in rows
    ]
    return build_roadmap(tree, extra)
