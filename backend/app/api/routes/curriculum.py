from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.card import Card
from app.models.material import StudyMaterial
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
from app.services.weekly_schedule import (
    load_weekly_schedule_model,
    today_block_items,
    track_slugs_for_weekday,
)

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

DEFAULT_PATH = Path(__file__).resolve().parents[3].parent / "docs" / "curriculum.json"


def _load_schedule() -> WeeklySchedule | None:
    return load_weekly_schedule_model()


@router.get("/schedule", response_model=WeeklySchedule)
def get_weekly_schedule() -> WeeklySchedule:
    schedule = _load_schedule()
    if not schedule:
        raise HTTPException(status_code=404, detail="Weekly schedule not found")
    return schedule


@router.get("/schedule/today", response_model=list[BlockScheduleItem])
def get_today_schedule() -> list[BlockScheduleItem]:
    return today_block_items()


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
) -> CurriculumOverview:
    now = datetime.now(UTC)
    schedule = _load_schedule()
    today = today_block_items()

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


@router.post("/import/default", response_model=dict[str, int])
def import_default(
    prune: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, int]:
    """Import the bundled curriculum at docs/curriculum.json."""
    if not DEFAULT_PATH.exists():
        raise HTTPException(status_code=404, detail=f"Default curriculum not found at {DEFAULT_PATH}")
    data = load_file(DEFAULT_PATH)
    return import_curriculum(db, user, data, prune_orphans=prune)


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
    return import_curriculum(db, user, payload.data)


