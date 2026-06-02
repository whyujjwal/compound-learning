from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.card import Card
from app.models.track_ai_update import TrackAIUpdate
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.user import User
from app.schemas.track import (
    TrackCreate,
    TrackProgressBlock,
    TrackProgressResponse,
    TrackResponse,
    TrackUpdate,
)
from app.services.bootstrap import ensure_scheduler_params
from app.services.fsrs_optimizer import optimize_track_weights
from app.services.mastery import is_mastered
from app.services.roadmap_generator import RoadmapError, generate_track_update

router = APIRouter(prefix="/tracks", tags=["tracks"])

def _track_response(db: Session, track: Track) -> TrackResponse:
    now = datetime.now(UTC)
    material_count = db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).count()
    # In the new model, "due" = FSRS-due reviews (reps>0). New unstarted items aren't "due".
    due_count = (
        db.query(Card)
        .join(StudyMaterial)
        .filter(
            StudyMaterial.track_id == track.id,
            Card.reps > 0,
            Card.due_at <= now,
        )
        .count()
    )
    return TrackResponse(
        id=track.id,
        user_id=track.user_id,
        slug=track.slug,
        name=track.name,
        description=track.description,
        color=track.color,
        cognitive_multiplier=track.cognitive_multiplier,
        is_system=track.is_system,
        is_public=track.is_public,
        is_featured=track.is_featured,
        star_count=track.star_count,
        adoption_count=track.adoption_count,
        rating_count=track.rating_count,
        rating_avg=track.rating_avg,
        quality_score=track.quality_score,
        source_track_id=track.source_track_id,
        generation_prompt=track.generation_prompt,
        created_at=track.created_at,
        material_count=material_count,
        due_card_count=due_count,
    )


@router.get("", response_model=list[TrackResponse])
def list_tracks(
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TrackResponse]:
    tracks = (
        db.query(Track)
        .filter(Track.user_id == user.id)
        .order_by(Track.is_system.desc(), Track.name)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_track_response(db, t) for t in tracks]


@router.post("", response_model=TrackResponse, status_code=201)
def create_track(
    payload: TrackCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TrackResponse:
    existing = (
        db.query(Track)
        .filter(Track.user_id == user.id, Track.slug == payload.slug)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Track slug '{payload.slug}' already exists")

    track = Track(
        user_id=user.id,
        slug=payload.slug,
        name=payload.name,
        description=payload.description,
        color=payload.color,
        cognitive_multiplier=payload.cognitive_multiplier,
        is_system=False,
        is_public=payload.is_public,
        published_at=datetime.now(UTC) if payload.is_public else None,
    )
    db.add(track)
    db.commit()
    db.refresh(track)
    ensure_scheduler_params(db, user, track)
    return _track_response(db, track)


@router.get("/{track_id}", response_model=TrackResponse)
def get_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TrackResponse:
    track = db.query(Track).filter(Track.id == track_id, Track.user_id == user.id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return _track_response(db, track)


@router.patch("/{track_id}", response_model=TrackResponse)
def update_track(
    track_id: UUID,
    payload: TrackUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TrackResponse:
    track = db.query(Track).filter(Track.id == track_id, Track.user_id == user.id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(track, field, value)

    db.commit()
    db.refresh(track)
    return _track_response(db, track)


@router.delete("/{track_id}", status_code=204)
def delete_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    track = db.query(Track).filter(Track.id == track_id, Track.user_id == user.id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    if track.is_system:
        raise HTTPException(status_code=400, detail="System tracks cannot be deleted")
    db.delete(track)
    db.commit()


@router.get("/slug/{slug}/progress", response_model=TrackProgressResponse)
def get_track_progress(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TrackProgressResponse:
    track = db.query(Track).filter(Track.user_id == user.id, Track.slug == slug).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    now = datetime.now(UTC)
    materials = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id)
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .all()
    )
    cards = (
        db.query(Card)
        .join(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id, Card.user_id == user.id)
        .all()
    )
    card_by_material = {c.material_id: c for c in cards}

    started = [c for c in cards if c.reps > 0]
    mastered = [c for c in cards if is_mastered(c)]
    due_reviews = sum(
        1
        for c in started
        if (c.due_at.replace(tzinfo=UTC) if c.due_at.tzinfo is None else c.due_at) <= now
    )
    avg_r = (
        sum(c.retrievability or 0 for c in started) / len(started)
        if started
        else 0.0
    )

    # Next: first material in sequence whose card has reps == 0
    next_material_id = None
    next_material_title = None
    next_material_url = None
    next_block_label = None
    for material in materials:
        card = card_by_material.get(material.id)
        if card is None or card.reps == 0:
            next_material_id = material.id
            next_material_title = material.title
            next_material_url = material.external_url
            next_block_label = material.block_label
            break

    # Block-level progress
    block_map: dict[str, TrackProgressBlock] = {}
    for material in materials:
        label = material.block_label or "Uncategorized"
        if label not in block_map:
            block_map[label] = TrackProgressBlock(
                label=label, material_count=0, started_count=0, mastered_count=0
            )
        block_map[label].material_count += 1
        card = card_by_material.get(material.id)
        if card is not None:
            if card.reps > 0:
                block_map[label].started_count += 1
            if is_mastered(card):
                block_map[label].mastered_count += 1

    return TrackProgressResponse(
        track_id=track.id,
        slug=track.slug,
        name=track.name,
        color=track.color,
        materials_total=len(materials),
        materials_started=len(started),
        materials_mastered=len(mastered),
        due_reviews=due_reviews,
        avg_retrievability=round(float(avg_r), 3),
        next_material_id=next_material_id,
        next_material_title=next_material_title,
        next_material_url=next_material_url,
        next_block_label=next_block_label,
        blocks=sorted(block_map.values(), key=lambda b: b.label),
    )


@router.post("/{track_id}/optimize-fsrs")
def optimize_fsrs(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    track = db.query(Track).filter(Track.id == track_id, Track.user_id == user.id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return optimize_track_weights(db, user, track.id)


class TrackAIUpdateRequest(BaseModel):
    instruction: str = Field(min_length=3, max_length=4000)
    apply: bool = True


class TrackAIUpdateResponse(BaseModel):
    id: UUID
    track_id: UUID
    status: str
    added_materials: int = 0
    result: dict | None = None
    error: str | None = None
    created_at: datetime


@router.post("/{track_id}/ai-updates", response_model=TrackAIUpdateResponse, status_code=201)
def request_track_ai_update(
    track_id: UUID,
    payload: TrackAIUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TrackAIUpdateResponse:
    track = db.query(Track).filter(Track.id == track_id, Track.user_id == user.id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    materials = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id)
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .all()
    )
    try:
        result = generate_track_update(track, materials, payload.instruction)
    except RoadmapError as e:
        row = TrackAIUpdate(
            track_id=track.id,
            user_id=user.id,
            instruction=payload.instruction,
            status="FAILED",
            error=str(e),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return TrackAIUpdateResponse(
            id=row.id,
            track_id=track.id,
            status=row.status,
            result=None,
            error=row.error,
            created_at=row.created_at,
        )

    added = 0
    if payload.apply:
        next_sequence = max([m.sequence for m in materials], default=0) + 1
        for i, item in enumerate(result.get("materials") or []):
            title = item.get("title")
            if not title:
                continue
            existing = (
                db.query(StudyMaterial)
                .filter(StudyMaterial.track_id == track.id, StudyMaterial.title == title)
                .first()
            )
            if existing:
                continue
            material = StudyMaterial(
                track_id=track.id,
                title=title,
                raw_content=item.get("notes"),
                external_url=item.get("url"),
                block_label=item.get("block_label") or f"{track.name} · AI update",
                resource_type=item.get("type"),
                sequence=item.get("sequence") or next_sequence + i,
                estimated_minutes=item.get("estimated_minutes", 20),
                priority_percent=item.get("priority_percent", 50),
                cognitive_cost_multiplier=item.get("cognitive_cost_multiplier", 1.0),
            )
            db.add(material)
            db.flush()
            db.add(Card(user_id=user.id, material_id=material.id))
            added += 1

    row = TrackAIUpdate(
        track_id=track.id,
        user_id=user.id,
        instruction=payload.instruction,
        status="APPLIED" if payload.apply else "PREVIEW",
        result=result,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return TrackAIUpdateResponse(
        id=row.id,
        track_id=track.id,
        status=row.status,
        added_materials=added,
        result=row.result,
        error=row.error,
        created_at=row.created_at,
    )
