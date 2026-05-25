from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.card import Card
from app.models.review_log import ReviewLog, ReviewRating
from app.schemas.stats import StatsResponse
from app.services.bootstrap import get_default_user
from app.services.stats_service import get_stats

router = APIRouter(prefix="/stats", tags=["stats"])


class ActivityPoint(BaseModel):
    date: date
    count: int


class RetentionPoint(BaseModel):
    date: date
    retention: float
    reviews: int


@router.get("", response_model=StatsResponse)
def get_user_stats(db: Session = Depends(get_db)) -> StatsResponse:
    user = get_default_user(db)
    return get_stats(db, user)


@router.get("/activity", response_model=list[ActivityPoint])
def get_activity(
    days: int = Query(120, ge=7, le=365), db: Session = Depends(get_db)
) -> list[ActivityPoint]:
    """Daily review counts for the last N days (filled with zeros for empty days)."""
    user = get_default_user(db)
    now = datetime.now(UTC)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    user_card_ids = select(Card.id).where(Card.user_id == user.id)

    rows = (
        db.query(
            func.date(ReviewLog.reviewed_at).label("day"),
            func.count(ReviewLog.id).label("count"),
        )
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= start,
        )
        .group_by("day")
        .all()
    )
    by_day: dict[date, int] = {}
    for day, count in rows:
        if isinstance(day, str):
            day = date.fromisoformat(day)
        by_day[day] = int(count)

    today = now.date()
    out: list[ActivityPoint] = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        out.append(ActivityPoint(date=d, count=by_day.get(d, 0)))
    return out


@router.get("/retention-timeline", response_model=list[RetentionPoint])
def get_retention_timeline(
    days: int = Query(30, ge=7, le=365), db: Session = Depends(get_db)
) -> list[RetentionPoint]:
    """Per-day retention rate (good+hard+easy / total) for the last N days."""
    user = get_default_user(db)
    now = datetime.now(UTC)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    user_card_ids = select(Card.id).where(Card.user_id == user.id)

    good_expr = case(
        (
            ReviewLog.rating.in_([ReviewRating.HARD, ReviewRating.GOOD, ReviewRating.EASY]),
            1,
        ),
        else_=0,
    )
    rows = (
        db.query(
            func.date(ReviewLog.reviewed_at).label("day"),
            func.count(ReviewLog.id).label("total"),
            func.sum(good_expr).label("good"),
        )
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= start,
        )
        .group_by("day")
        .all()
    )
    by_day: dict[date, tuple[int, int]] = {}
    for day, total, good in rows:
        if isinstance(day, str):
            day = date.fromisoformat(day)
        by_day[day] = (int(total or 0), int(good or 0))

    today = now.date()
    out: list[RetentionPoint] = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        total, good = by_day.get(d, (0, 0))
        retention = round(good / total, 3) if total else 0.0
        out.append(RetentionPoint(date=d, retention=retention, reviews=total))
    return out
