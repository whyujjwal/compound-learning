from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.queue import DailyQueueResponse, QueueItem
from app.services.bootstrap import get_default_user
from app.services.queue_service import build_daily_queue, build_extra_pull

router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("/daily", response_model=DailyQueueResponse)
def get_daily_queue(db: Session = Depends(get_db)) -> DailyQueueResponse:
    user = get_default_user(db)
    return build_daily_queue(db, user)


@router.get("/extra", response_model=list[QueueItem])
def get_extra(
    track: str = Query(..., description="Track slug to pull new items from"),
    count: int = Query(5, ge=1, le=20),
    exclude: list[str] = Query(default_factory=list, description="card ids to exclude"),
    db: Session = Depends(get_db),
) -> list[QueueItem]:
    """Pull N more new-in-sequence items from a single track on demand."""
    user = get_default_user(db)
    return build_extra_pull(db, user, track, count, exclude_card_ids=exclude)
