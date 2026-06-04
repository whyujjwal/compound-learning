from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.review_log import ReviewLog, ReviewRating
from app.models.study_session import StudySession
from app.models.track import Track
from app.models.user import User
from app.schemas.stats import StatsResponse, TrackStats
from app.services.timezone import local_date_for, local_day_bounds, local_today, utc_now


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _compute_streaks(
    review_dates: list[datetime],
    timezone_name: str | None = None,
    user: User | None = None,
) -> tuple[int, int]:
    if not review_dates:
        return 0, 0

    unique_days = sorted(
        {local_date_for(d, timezone_name, user) for d in review_dates},
        reverse=True,
    )
    today = local_today(timezone_name, user, now)

    current = 0
    expected = today
    for day in unique_days:
        if day == expected:
            current += 1
            expected -= timedelta(days=1)
        elif day == today - timedelta(days=1) and current == 0:
            current = 1
            expected = day - timedelta(days=1)
        else:
            break

    longest = 1
    run = 1
    asc_days = sorted(unique_days)
    for i in range(1, len(asc_days)):
        if asc_days[i] - asc_days[i - 1] == timedelta(days=1):
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    return current, longest


def get_stats(
    db: Session,
    user: User,
    timezone_name: str | None = None,
) -> StatsResponse:
    now = utc_now()
    today = local_today(timezone_name, user)
    today_start, tomorrow_start = local_day_bounds(today, timezone_name, user)
    week_start, _ = local_day_bounds(today - timedelta(days=6), timezone_name, user)
    month_start, _ = local_day_bounds(today - timedelta(days=29), timezone_name, user)

    total_cards = db.query(Card).filter(Card.user_id == user.id).count()
    # "Due" now means FSRS-due reviews only (reps > 0) — new unstarted items aren't "due".
    due_cards = (
        db.query(Card)
        .filter(Card.user_id == user.id, Card.reps > 0, Card.due_at <= now)
        .count()
    )
    materials_started = (
        db.query(Card).filter(Card.user_id == user.id, Card.reps > 0).count()
    )
    materials_mastered = (
        db.query(Card)
        .filter(Card.user_id == user.id, Card.reps >= 3, Card.retrievability >= 0.85)
        .count()
    )
    total_materials = (
        db.query(StudyMaterial)
        .join(Track)
        .filter(Track.user_id == user.id)
        .count()
    )
    total_tracks = db.query(Track).filter(Track.user_id == user.id).count()

    user_card_ids = select(Card.id).where(Card.user_id == user.id)

    reviews_total = db.query(ReviewLog).filter(ReviewLog.card_id.in_(user_card_ids)).count()
    reviews_today = (
        db.query(ReviewLog)
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= today_start,
            ReviewLog.reviewed_at < tomorrow_start,
        )
        .count()
    )
    reviews_this_week = (
        db.query(ReviewLog)
        .filter(ReviewLog.card_id.in_(user_card_ids), ReviewLog.reviewed_at >= week_start)
        .count()
    )

    successful = (
        db.query(ReviewLog)
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.rating.in_([ReviewRating.HARD, ReviewRating.GOOD, ReviewRating.EASY]),
        )
        .count()
    )
    retention_rate = round(successful / reviews_total, 3) if reviews_total else 0.0

    avg_seconds = (
        db.query(func.avg(ReviewLog.elapsed_time_seconds))
        .filter(ReviewLog.card_id.in_(user_card_ids))
        .scalar()
    ) or 0.0

    streak_lookback_start, _ = local_day_bounds(today - timedelta(days=400), timezone_name, user)
    review_dates = [
        r[0]
        for r in db.query(ReviewLog.reviewed_at)
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= streak_lookback_start,
        )
        .order_by(ReviewLog.reviewed_at.desc())
        .all()
    ]
    current_streak, longest_streak = _compute_streaks(review_dates, timezone_name, user)

    # Friendlier session-based metrics (no streak pressure)
    week_days = {
        local_date_for(d, timezone_name, user) for d in review_dates if _aware(d) >= week_start
    }
    month_days = {
        local_date_for(d, timezone_name, user) for d in review_dates if _aware(d) >= month_start
    }
    total_seconds = (
        db.query(func.coalesce(func.sum(ReviewLog.elapsed_time_seconds), 0))
        .filter(ReviewLog.card_id.in_(user_card_ids))
        .scalar()
    ) or 0
    session_minutes = (
        db.query(func.coalesce(func.sum(StudySession.duration_minutes), 0))
        .filter(StudySession.user_id == user.id)
        .scalar()
    ) or 0
    total_minutes_invested = int(round(float(total_seconds) / 60)) + int(session_minutes)

    study_sessions_week = (
        db.query(StudySession)
        .filter(StudySession.user_id == user.id, StudySession.created_at >= week_start)
        .count()
    )

    review_seconds_today = (
        db.query(func.coalesce(func.sum(ReviewLog.elapsed_time_seconds), 0))
        .filter(
            ReviewLog.card_id.in_(user_card_ids),
            ReviewLog.reviewed_at >= today_start,
            ReviewLog.reviewed_at < tomorrow_start,
        )
        .scalar()
    ) or 0
    session_minutes_today = (
        db.query(func.coalesce(func.sum(StudySession.duration_minutes), 0))
        .filter(
            StudySession.user_id == user.id,
            StudySession.created_at >= today_start,
            StudySession.created_at < tomorrow_start,
        )
        .scalar()
    ) or 0
    minutes_today = int(round(float(review_seconds_today) / 60)) + int(session_minutes_today)

    tracks = db.query(Track).filter(Track.user_id == user.id).all()
    track_ids = [t.id for t in tracks]
    material_counts: dict[UUID, int] = {}
    card_counts: dict[UUID, int] = {}
    due_counts: dict[UUID, int] = {}
    review_counts: dict[UUID, int] = {}
    if track_ids:
        material_counts = {
            row[0]: int(row[1])
            for row in db.query(StudyMaterial.track_id, func.count(StudyMaterial.id))
            .filter(StudyMaterial.track_id.in_(track_ids))
            .group_by(StudyMaterial.track_id)
            .all()
        }
        card_rows = (
            db.query(
                StudyMaterial.track_id,
                func.count(Card.id),
                func.sum(
                    case(
                        ((Card.reps > 0) & (Card.due_at <= now), 1),
                        else_=0,
                    )
                ),
            )
            .join(Card, Card.material_id == StudyMaterial.id)
            .filter(StudyMaterial.track_id.in_(track_ids), Card.user_id == user.id)
            .group_by(StudyMaterial.track_id)
            .all()
        )
        for track_id, total_cards, due in card_rows:
            card_counts[track_id] = int(total_cards or 0)
            due_counts[track_id] = int(due or 0)
        review_counts = {
            row[0]: int(row[1])
            for row in db.query(StudyMaterial.track_id, func.count(ReviewLog.id))
            .join(Card, Card.material_id == StudyMaterial.id)
            .join(ReviewLog, ReviewLog.card_id == Card.id)
            .filter(StudyMaterial.track_id.in_(track_ids), Card.user_id == user.id)
            .group_by(StudyMaterial.track_id)
            .all()
        }
    track_breakdown: list[TrackStats] = []
    for track in tracks:
        track_breakdown.append(
            TrackStats(
                track_id=track.id,
                track_name=track.name,
                track_color=track.color,
                material_count=material_counts.get(track.id, 0),
                card_count=card_counts.get(track.id, 0),
                due_count=due_counts.get(track.id, 0),
                reviews_total=review_counts.get(track.id, 0),
            )
        )

    return StatsResponse(
        total_cards=total_cards,
        due_cards=due_cards,
        total_materials=total_materials,
        total_tracks=total_tracks,
        materials_started=materials_started,
        materials_mastered=materials_mastered,
        reviews_today=reviews_today,
        reviews_this_week=reviews_this_week,
        reviews_total=reviews_total,
        sessions_this_week=max(len(week_days), study_sessions_week),
        days_active_30d=len(month_days),
        total_minutes_invested=total_minutes_invested,
        minutes_today=minutes_today,
        daily_goal_minutes=user.daily_study_minutes,
        retention_rate=retention_rate,
        current_streak=current_streak,
        longest_streak=longest_streak,
        avg_review_seconds=round(float(avg_seconds), 1),
        track_breakdown=track_breakdown,
    )
