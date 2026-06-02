from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_client_timezone, get_current_user
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.roadmap_generation import RoadmapGeneration
from app.models.track import Track
from app.models.user import User
from app.schemas.curriculum import (
    BlockScheduleItem,
    BlockSummary,
    CurriculumOverview,
    TrackCurriculumSummary,
    WeeklySchedule,
)
from app.schemas.reschedule import RescheduleRequest, RescheduleResponse
from app.services.curriculum_loader import import_curriculum, load_file
from app.services.mastery import is_mastered
from app.services.roadmap_generator import RoadmapError, generate_roadmap
from app.services.weekly_schedule import (
    invalidate_schedule_cache,
    schedule_for_user,
    today_block_items,
)

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

DEFAULT_PATH = Path(__file__).resolve().parents[3].parent / "docs" / "curriculum.json"


@router.get("/schedule", response_model=WeeklySchedule)
def get_weekly_schedule(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WeeklySchedule:
    schedule = schedule_for_user(user)
    if not schedule:
        raise HTTPException(status_code=404, detail="Weekly schedule not found")
    return schedule


@router.get("/schedule/today", response_model=list[BlockScheduleItem])
def get_today_schedule(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> list[BlockScheduleItem]:
    return today_block_items(user, timezone_name)


@router.put("/schedule", response_model=WeeklySchedule)
def set_weekly_schedule(
    payload: WeeklySchedule,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WeeklySchedule:
    """Persist a learner-built weekly schedule. Each day is an ordered list of
    blocks ({block, track, minutes?}); the daily queue and HEFT planner read it
    directly, so the learner has full control over which tracks run on which
    days, in what order, and for how long."""
    user.weekly_schedule = payload.model_dump()
    db.commit()
    db.refresh(user)
    invalidate_schedule_cache()
    return payload


@router.get("/examples")
def get_example_curriculum() -> dict[str, Any]:
    """Return the bundled four-track curriculum as optional importable examples."""
    if not DEFAULT_PATH.exists():
        raise HTTPException(status_code=404, detail=f"Example curriculum not found at {DEFAULT_PATH}")
    return load_file(DEFAULT_PATH)


@router.post("/reschedule", response_model=RescheduleResponse)
def reschedule_curriculum(
    payload: RescheduleRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RescheduleResponse:
    """Adjust pacing from a start date. Does not shift FSRS due dates — only reports lagging tracks."""
    tracks = db.query(Track).filter(Track.user_id == user.id).all()
    lagging: list[str] = []
    for track in tracks:
        materials = db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).count()
        if materials == 0:
            continue
        cards = (
            db.query(Card)
            .join(StudyMaterial)
            .filter(StudyMaterial.track_id == track.id, Card.user_id == user.id)
            .all()
        )
        mastered = sum(1 for c in cards if is_mastered(c))
        if materials and mastered / materials < 0.15:
            lagging.append(track.slug)
    return RescheduleResponse(
        start_date=payload.start_date,
        message=(
            f"Pace review from {payload.start_date.isoformat()}. "
            f"Lagging tracks: {', '.join(lagging) if lagging else 'none'}."
        ),
        adjusted_tracks=lagging,
    )


@router.get("/overview", response_model=CurriculumOverview)
def curriculum_overview(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> CurriculumOverview:
    now = datetime.now(UTC)
    schedule = schedule_for_user(user)
    today = today_block_items(user, timezone_name)

    tracks = db.query(Track).filter(Track.user_id == user.id).order_by(Track.name).all()
    track_summaries: list[TrackCurriculumSummary] = []

    total_materials = 0
    total_cards = 0
    total_started = 0
    total_mastered = 0
    total_due_reviews = 0

    for track in tracks:
        materials = (
            db.query(StudyMaterial)
            .filter(StudyMaterial.track_id == track.id)
            .order_by(StudyMaterial.sequence, StudyMaterial.title)
            .all()
        )
        cards = (
            db.query(Card)
            .join(StudyMaterial)
            .filter(StudyMaterial.track_id == track.id, Card.user_id == user.id)
            .all()
        )
        card_by_material = {c.material_id: c for c in cards}

        started = sum(1 for c in cards if c.reps > 0)
        mastered = sum(1 for c in cards if is_mastered(c))
        due_reviews = sum(
            1
            for c in cards
            if c.reps > 0
            and (c.due_at.replace(tzinfo=UTC) if c.due_at.tzinfo is None else c.due_at) <= now
        )

        # next-in-sequence unstarted material
        next_material = None
        next_block = None
        for material in materials:
            card = card_by_material.get(material.id)
            if card is None or card.reps == 0:
                next_material = material.title
                next_block = material.block_label
                break

        total_materials += len(materials)
        total_cards += len(cards)
        total_started += started
        total_mastered += mastered
        total_due_reviews += due_reviews

        block_map: dict[str, BlockSummary] = {}
        for material in materials:
            label = material.block_label or "Uncategorized"
            if label not in block_map:
                block_map[label] = BlockSummary(
                    label=label,
                    material_count=0,
                )
            block_map[label].material_count += 1
            card = card_by_material.get(material.id)
            if card:
                if card.reps > 0:
                    block_map[label].started_count += 1
                if is_mastered(card):
                    block_map[label].mastered_count += 1
                if (card is None or card.reps == 0) and not block_map[label].next_material:
                    block_map[label].next_material = material.title
                    block_map[label].next_url = material.external_url

        track_summaries.append(
            TrackCurriculumSummary(
                id=track.id,
                slug=track.slug,
                name=track.name,
                color=track.color,
                description=track.description,
                material_count=len(materials),
                card_count=len(cards),
                started_count=started,
                mastered_count=mastered,
                due_review_count=due_reviews,
                next_material=next_material,
                next_block_label=next_block,
                blocks=sorted(block_map.values(), key=lambda b: b.label),
            )
        )

    version = None
    if DEFAULT_PATH.exists():
        version = load_file(DEFAULT_PATH).get("version")

    return CurriculumOverview(
        version=version,
        total_materials=total_materials,
        total_cards=total_cards,
        total_started=total_started,
        total_mastered=total_mastered,
        due_reviews=total_due_reviews,
        weekly_schedule=schedule,
        today_blocks=today,
        tracks=track_summaries,
    )


class ImportFromPathRequest(BaseModel):
    path: str | None = None


class ImportFromJSONRequest(BaseModel):
    data: dict[str, Any]
    replace: bool = False


@router.post("/import/default", response_model=dict[str, int])
def import_default(
    prune: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, int]:
    """Import the bundled curriculum at docs/curriculum.json.

    Kept for compatibility; in-product this is presented as importing examples.
    """
    if not DEFAULT_PATH.exists():
        raise HTTPException(status_code=404, detail=f"Default curriculum not found at {DEFAULT_PATH}")
    data = load_file(DEFAULT_PATH)
    return import_curriculum(db, user, data, prune_orphans=prune)


@router.post("/import/examples", response_model=dict[str, int])
def import_examples(
    prune: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, int]:
    """Import the bundled four-track curriculum as examples for this learner."""
    if not DEFAULT_PATH.exists():
        raise HTTPException(status_code=404, detail=f"Example curriculum not found at {DEFAULT_PATH}")
    data = load_file(DEFAULT_PATH)
    stats = import_curriculum(db, user, data, prune_orphans=prune, set_schedule=True)
    user.onboarded = True
    db.commit()
    return stats


@router.post("/import/path", response_model=dict[str, int])
def import_from_path(
    payload: ImportFromPathRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, int]:
    if not payload.path:
        raise HTTPException(status_code=400, detail="path is required")
    try:
        data = load_file(payload.path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return import_curriculum(db, user, data)


@router.post("/import", response_model=dict[str, int])
def import_inline(
    payload: ImportFromJSONRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, int]:
    return import_curriculum(
        db, user, payload.data, prune_orphans=payload.replace, set_schedule=True
    )


class GenerateRoadmapRequest(BaseModel):
    goals: str
    weekly_hours: int = 10
    level: str | None = None
    apply: bool = False
    replace: bool = False


class GenerateRoadmapResponse(BaseModel):
    curriculum: dict[str, Any]
    applied: bool
    stats: dict[str, int] | None = None
    generation_id: UUID | None = None


class RoadmapGenerationSummary(BaseModel):
    id: UUID
    title: str
    goals: str
    weekly_hours: int
    level: str | None
    track_count: int
    applied: bool
    created_at: datetime


class RoadmapGenerationDetail(RoadmapGenerationSummary):
    curriculum: dict[str, Any]


def _roadmap_title(goals: str) -> str:
    line = goals.strip().split("\n", 1)[0].strip()
    return (line[:197] + "…") if len(line) > 200 else line or "Untitled roadmap"


def _save_generation(
    db: Session,
    user: User,
    *,
    goals: str,
    weekly_hours: int,
    level: str | None,
    curriculum: dict[str, Any],
    applied: bool,
) -> RoadmapGeneration:
    row = RoadmapGeneration(
        user_id=user.id,
        goals=goals,
        weekly_hours=weekly_hours,
        level=level,
        title=_roadmap_title(goals),
        curriculum=curriculum,
        applied=applied,
    )
    db.add(row)
    db.flush()
    return row


@router.post("/generate", response_model=GenerateRoadmapResponse)
def generate_curriculum_roadmap(
    payload: GenerateRoadmapRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GenerateRoadmapResponse:
    """Generate a personalized roadmap from free-text goals.

    When ``apply`` is true the roadmap is imported immediately (and the user's
    weekly schedule + goals are saved). When ``replace`` is also true, existing
    materials in matching tracks are pruned so the new roadmap is authoritative.

    Every successful generation is saved to history for future reference, even
    when ``apply`` is false.
    """
    try:
        curriculum = generate_roadmap(
            payload.goals, weekly_hours=payload.weekly_hours, level=payload.level
        )
    except RoadmapError as e:
        raise HTTPException(status_code=503, detail=str(e))
    for track_data in curriculum.get("tracks", []):
        track_data.setdefault("is_public", True)
        track_data["generation_prompt"] = payload.goals

    if not payload.apply:
        saved = _save_generation(
            db,
            user,
            goals=payload.goals,
            weekly_hours=payload.weekly_hours,
            level=payload.level,
            curriculum=curriculum,
            applied=False,
        )
        db.commit()
        return GenerateRoadmapResponse(
            curriculum=curriculum, applied=False, generation_id=saved.id
        )

    stats = import_curriculum(
        db, user, curriculum, prune_orphans=payload.replace, set_schedule=True
    )
    user.learning_goals = payload.goals[:2000]
    user.onboarded = True
    saved = _save_generation(
        db,
        user,
        goals=payload.goals,
        weekly_hours=payload.weekly_hours,
        level=payload.level,
        curriculum=curriculum,
        applied=True,
    )
    db.commit()
    return GenerateRoadmapResponse(
        curriculum=curriculum, applied=True, stats=stats, generation_id=saved.id
    )


@router.get("/generations", response_model=list[RoadmapGenerationSummary])
def list_roadmap_generations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[RoadmapGenerationSummary]:
    rows = (
        db.query(RoadmapGeneration)
        .filter(RoadmapGeneration.user_id == user.id)
        .order_by(RoadmapGeneration.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        RoadmapGenerationSummary(
            id=r.id,
            title=r.title,
            goals=r.goals,
            weekly_hours=r.weekly_hours,
            level=r.level,
            track_count=len((r.curriculum or {}).get("tracks") or []),
            applied=r.applied,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/generations/{generation_id}", response_model=RoadmapGenerationDetail)
def get_roadmap_generation(
    generation_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RoadmapGenerationDetail:
    row = (
        db.query(RoadmapGeneration)
        .filter(RoadmapGeneration.id == generation_id, RoadmapGeneration.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return RoadmapGenerationDetail(
        id=row.id,
        title=row.title,
        goals=row.goals,
        weekly_hours=row.weekly_hours,
        level=row.level,
        track_count=len((row.curriculum or {}).get("tracks") or []),
        applied=row.applied,
        created_at=row.created_at,
        curriculum=row.curriculum,
    )


@router.delete("/generations/{generation_id}", status_code=204)
def delete_roadmap_generation(
    generation_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    row = (
        db.query(RoadmapGeneration)
        .filter(RoadmapGeneration.id == generation_id, RoadmapGeneration.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    db.delete(row)
    db.commit()
