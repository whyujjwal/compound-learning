from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.queue import DailyQueueResponse, QueueItem
from app.services.queue_service import build_daily_queue, build_extra_pull

router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("/daily", response_model=DailyQueueResponse)
def get_daily_queue(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DailyQueueResponse:
    return build_daily_queue(db, user)


@router.get("/extra", response_model=list[QueueItem])
def get_extra(
    track: str = Query(..., description="Track slug to pull new items from"),
    count: int = Query(5, ge=1, le=20),
    exclude: list[str] = Query(default_factory=list, description="card ids to exclude"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[QueueItem]:
    return build_extra_pull(db, user, track, count, exclude_card_ids=exclude)
