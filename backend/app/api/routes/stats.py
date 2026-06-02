from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_client_timezone, get_current_user
from app.models.card import Card
from app.models.review_log import ReviewLog, ReviewRating
from app.models.user import User
from app.schemas.stats import StatsResponse
from app.services.stats_service import get_stats
from app.services.timezone import local_date_for, local_day_bounds, local_today

router = APIRouter(prefix="/stats", tags=["stats"])


class ActivityPoint(BaseModel):
    date: date
    count: int


class RetentionPoint(BaseModel):
    date: date
    retention: float
    reviews: int


@router.get("", response_model=StatsResponse)
def get_user_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> StatsResponse:
    return get_stats(db, user, timezone_name)


@router.get("/activity", response_model=list[ActivityPoint])
def get_activity(
    days: int = Query(120, ge=7, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> list[ActivityPoint]:
    today = local_today(timezone_name, user)
    start_day = today - timedelta(days=days - 1)
    start, _ = local_day_bounds(start_day, timezone_name, user)
    user_card_ids = select(Card.id).where(Card.user_id == user.id)

    rows = (
        db.query(ReviewLog.reviewed_at)
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= start,
        )
        .all()
    )
    by_day: dict[date, int] = {}
    for (reviewed_at,) in rows:
        day = local_date_for(reviewed_at, timezone_name, user)
        by_day[day] = by_day.get(day, 0) + 1

    out: list[ActivityPoint] = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        out.append(ActivityPoint(date=d, count=by_day.get(d, 0)))
    return out


@router.get("/retention-timeline", response_model=list[RetentionPoint])
def get_retention_timeline(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> list[RetentionPoint]:
    today = local_today(timezone_name, user)
    start_day = today - timedelta(days=days - 1)
    start, _ = local_day_bounds(start_day, timezone_name, user)
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
            ReviewLog.reviewed_at,
            func.count(ReviewLog.id).label("total"),
            func.sum(good_expr).label("good"),
        )
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= start,
        )
        .group_by(ReviewLog.reviewed_at)
        .all()
    )
    by_day: dict[date, tuple[int, int]] = {}
    for reviewed_at, total, good in rows:
        day = local_date_for(reviewed_at, timezone_name, user)
        old_total, old_good = by_day.get(day, (0, 0))
        by_day[day] = (old_total + int(total or 0), old_good + int(good or 0))

    out: list[RetentionPoint] = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        total, good = by_day.get(d, (0, 0))
        retention = round(good / total, 3) if total else 0.0
        out.append(RetentionPoint(date=d, retention=retention, reviews=total))
    return out
