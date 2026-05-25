from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.review_log import ReviewLog, ReviewRating
from app.models.track import Track
from app.models.user import User
from app.schemas.stats import StatsResponse, TrackStats


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _compute_streaks(review_dates: list[datetime]) -> tuple[int, int]:
    if not review_dates:
        return 0, 0

    unique_days = sorted({_aware(d).date() for d in review_dates}, reverse=True)
    today = datetime.now(UTC).date()

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


def get_stats(db: Session, user: User) -> StatsResponse:
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    total_cards = db.query(Card).filter(Card.user_id == user.id).count()
    due_cards = (
        db.query(Card)
        .filter(Card.user_id == user.id, Card.due_at <= now)
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
        .filter(ReviewLog.card_id.in_(user_card_ids), ReviewLog.reviewed_at >= today_start)
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

    review_dates = [
        r[0]
        for r in db.query(ReviewLog.reviewed_at)
        .filter(ReviewLog.card_id.in_(user_card_ids))
        .order_by(ReviewLog.reviewed_at.desc())
        .all()
    ]
    current_streak, longest_streak = _compute_streaks(review_dates)

    tracks = db.query(Track).filter(Track.user_id == user.id).all()
    track_breakdown: list[TrackStats] = []
    for track in tracks:
        material_count = (
            db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).count()
        )
        cards = (
            db.query(Card)
            .join(StudyMaterial)
            .filter(StudyMaterial.track_id == track.id, Card.user_id == user.id)
            .all()
        )
        card_ids = [c.id for c in cards]
        reviews_count = (
            db.query(ReviewLog).filter(ReviewLog.card_id.in_(card_ids)).count()
            if card_ids
            else 0
        )
        track_breakdown.append(
            TrackStats(
                track_id=track.id,
                track_name=track.name,
                track_color=track.color,
                material_count=material_count,
                card_count=len(cards),
                due_count=sum(1 for c in cards if _aware(c.due_at) <= now),
                reviews_total=reviews_count,
            )
        )

    return StatsResponse(
        total_cards=total_cards,
        due_cards=due_cards,
        total_materials=total_materials,
        total_tracks=total_tracks,
        reviews_today=reviews_today,
        reviews_this_week=reviews_this_week,
        reviews_total=reviews_total,
        retention_rate=retention_rate,
        current_streak=current_streak,
        longest_streak=longest_streak,
        avg_review_seconds=round(float(avg_seconds), 1),
        track_breakdown=track_breakdown,
    )
