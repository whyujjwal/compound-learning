from datetime import UTC, datetime
from uuid import UUID

from fsrs import Card as FSRSCard
from fsrs import Rating, Scheduler, State
from sqlalchemy.orm import Session

from app.models.card import Card, CardState
from app.models.review_log import ReviewLog, ReviewRating
from app.models.scheduler_params import DEFAULT_FSRS_WEIGHTS, SchedulerParameters
from app.models.user import User
from app.services import gamification_service as gamification


def _to_fsrs_state(state: CardState) -> State:
    mapping = {
        CardState.LEARNING: State.Learning,
        CardState.REVIEW: State.Review,
        CardState.RELEARNING: State.Relearning,
    }
    return mapping[state]


def _from_fsrs_state(state: State) -> CardState:
    mapping = {
        State.Learning: CardState.LEARNING,
        State.Review: CardState.REVIEW,
        State.Relearning: CardState.RELEARNING,
    }
    return mapping[state]


def _to_fsrs_rating(rating: ReviewRating) -> Rating:
    mapping = {
        ReviewRating.AGAIN: Rating.Again,
        ReviewRating.HARD: Rating.Hard,
        ReviewRating.GOOD: Rating.Good,
        ReviewRating.EASY: Rating.Easy,
    }
    return mapping[rating]


def get_scheduler(db: Session, user: User, track_id: UUID) -> Scheduler:
    params = (
        db.query(SchedulerParameters)
        .filter(
            SchedulerParameters.user_id == user.id,
            SchedulerParameters.track_id == track_id,
        )
        .first()
    )
    weights = tuple(params.weights) if params else tuple(DEFAULT_FSRS_WEIGHTS)
    return Scheduler(parameters=weights, desired_retention=user.target_retention)


def card_to_fsrs(card: Card) -> FSRSCard:
    fsrs_card = FSRSCard(card_id=int(card.id.int % (2**63)))
    fsrs_card.state = _to_fsrs_state(card.state)
    fsrs_card.difficulty = card.difficulty
    fsrs_card.stability = card.stability
    fsrs_card.due = card.due_at.replace(tzinfo=UTC) if card.due_at.tzinfo is None else card.due_at
    if card.last_reviewed_at:
        fsrs_card.last_review = (
            card.last_reviewed_at.replace(tzinfo=UTC)
            if card.last_reviewed_at.tzinfo is None
            else card.last_reviewed_at
        )
    return fsrs_card


def apply_fsrs_to_card(card: Card, fsrs_card: FSRSCard, scheduler: Scheduler) -> None:
    card.state = _from_fsrs_state(fsrs_card.state)
    card.difficulty = fsrs_card.difficulty or card.difficulty
    card.stability = fsrs_card.stability or card.stability
    card.due_at = fsrs_card.due.replace(tzinfo=None) if fsrs_card.due else card.due_at
    card.retrievability = scheduler.get_card_retrievability(fsrs_card)


def review_card(
    db: Session,
    card: Card,
    user: User,
    rating: ReviewRating,
    elapsed_seconds: int,
) -> tuple[Card, ReviewLog, int, int, list]:
    track_id = card.material.track_id
    scheduler = get_scheduler(db, user, track_id)
    fsrs_card = card_to_fsrs(card)
    now = datetime.now(UTC)

    # Capture before any mutation: a brand-new card has never been reviewed.
    is_first_review = card.last_reviewed_at is None

    actual_days = 0
    if card.last_reviewed_at:
        last = (
            card.last_reviewed_at.replace(tzinfo=UTC)
            if card.last_reviewed_at.tzinfo is None
            else card.last_reviewed_at
        )
        # Round to nearest day so sub-day learning steps aren't silently truncated to 0.
        actual_days = max(0, round((now - last).total_seconds() / 86400))

    updated_fsrs, _ = scheduler.review_card(
        fsrs_card,
        _to_fsrs_rating(rating),
        review_datetime=now,
        review_duration=elapsed_seconds,
    )

    apply_fsrs_to_card(card, updated_fsrs, scheduler)
    card.last_reviewed_at = now.replace(tzinfo=None)

    if rating == ReviewRating.AGAIN:
        card.lapses += 1
    else:
        card.reps += 1

    new_scheduled_days = max(
        0, round((updated_fsrs.due.replace(tzinfo=UTC) - now).total_seconds() / 86400)
    )

    log = ReviewLog(
        card_id=card.id,
        rating=rating,
        elapsed_time_seconds=elapsed_seconds,
        actual_interval_days=actual_days,
        scheduled_interval_days=new_scheduled_days,
        reviewed_at=now.replace(tzinfo=None),
    )
    db.add(log)
    gamification.award_review_xp(user, is_first_review=is_first_review)
    db.commit()
    db.refresh(card)

    # Evaluate achievements after the review is persisted so it counts toward totals.
    newly_unlocked = gamification.evaluate_achievements(db, user)
    return card, log, actual_days, new_scheduled_days, newly_unlocked
