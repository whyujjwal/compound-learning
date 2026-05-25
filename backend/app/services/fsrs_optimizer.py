"""FSRS weight optimization from review history."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.review_log import ReviewLog, ReviewRating
from app.models.scheduler_params import DEFAULT_FSRS_WEIGHTS, SchedulerParameters
from app.models.user import User
from app.services.fsrs_service import get_scheduler

MIN_REVIEWS_FOR_OPTIMIZE = 100


def optimize_track_weights(db: Session, user: User, track_id: UUID) -> dict:
    review_count = (
        db.query(ReviewLog)
        .join(Card)
        .join(StudyMaterial)
        .filter(StudyMaterial.track_id == track_id, Card.user_id == user.id)
        .count()
    )
    if review_count < MIN_REVIEWS_FOR_OPTIMIZE:
        return {
            "optimized": False,
            "review_count": review_count,
            "required": MIN_REVIEWS_FOR_OPTIMIZE,
            "message": f"Need at least {MIN_REVIEWS_FOR_OPTIMIZE} reviews to optimize",
        }

    params = (
        db.query(SchedulerParameters)
        .filter(
            SchedulerParameters.user_id == user.id,
            SchedulerParameters.track_id == track_id,
        )
        .first()
    )
    if not params:
        return {"optimized": False, "message": "No scheduler parameters found"}

    try:
        from fsrs import Optimizer, ReviewLog as FSRSReviewLog, Rating

        rating_map = {
            ReviewRating.AGAIN: Rating.Again,
            ReviewRating.HARD: Rating.Hard,
            ReviewRating.GOOD: Rating.Good,
            ReviewRating.EASY: Rating.Easy,
        }
        logs = (
            db.query(ReviewLog)
            .join(Card)
            .join(StudyMaterial)
            .filter(StudyMaterial.track_id == track_id, Card.user_id == user.id)
            .order_by(ReviewLog.reviewed_at.asc())
            .all()
        )
        fsrs_logs = [
            FSRSReviewLog(
                rating=rating_map[log.rating],
                delta_t=log.scheduled_interval_days or 1,
            )
            for log in logs
        ]
        optimizer = Optimizer()
        weights = optimizer.compute_optimal_parameters(fsrs_logs)
        params.weights = list(weights)
        db.commit()
        return {"optimized": True, "review_count": review_count, "weights": list(weights)}
    except Exception as e:
        scheduler = get_scheduler(db, user, track_id)
        _ = scheduler
        return {
            "optimized": False,
            "review_count": review_count,
            "message": f"Optimization unavailable: {e}. Keeping current weights.",
            "weights": list(params.weights or DEFAULT_FSRS_WEIGHTS),
        }
