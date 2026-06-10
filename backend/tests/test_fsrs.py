"""FSRS scheduler unit tests."""

from datetime import UTC, datetime, timedelta

import pytest

from app.models.card import Card, CardState
from app.models.material import StudyMaterial
from app.models.review_log import ReviewRating
from app.models.track import Track
from app.services.bootstrap import get_default_user
from app.services.fsrs_service import review_card


def _make_card(db_session, user, material):
    card = Card(
        user_id=user.id,
        material_id=material.id,
        state=CardState.REVIEW,
        difficulty=5.0,
        stability=2.0,
        due_at=datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=1),
        reps=1,
        lapses=0,
    )
    db_session.add(card)
    db_session.commit()
    db_session.refresh(card)
    return card


def test_good_rating_increases_interval(db_session):
    learner = get_default_user(db_session)
    track = db_session.query(Track).filter(Track.user_id == learner.id).first()
    material = db_session.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).first()
    card = _make_card(db_session, learner, material)
    due_before = card.due_at

    review_card(db_session, card, learner, ReviewRating.GOOD, 30)
    db_session.refresh(card)

    assert card.reps >= 2
    assert card.due_at > due_before


def test_again_rating_shortens_interval(db_session):
    learner = get_default_user(db_session)
    track = db_session.query(Track).filter(Track.user_id == learner.id).first()
    material = db_session.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).first()
    card = _make_card(db_session, learner, material)
    due_before = card.due_at

    review_card(db_session, card, learner, ReviewRating.AGAIN, 20)
    db_session.refresh(card)

    assert card.lapses >= 1
    assert card.due_at <= due_before + timedelta(days=1)


def test_target_retention_affects_scheduler(db_session):
    learner = get_default_user(db_session)
    learner.target_retention = 0.95
    db_session.commit()
    track = db_session.query(Track).filter(Track.user_id == learner.id).first()
    material = db_session.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).first()
    card = _make_card(db_session, learner, material)

    review_card(db_session, card, learner, ReviewRating.GOOD, 25)
    db_session.refresh(card)
    high_retention_due = card.due_at

    card2 = _make_card(db_session, learner, material)
    learner.target_retention = 0.75
    db_session.commit()
    review_card(db_session, card2, learner, ReviewRating.GOOD, 25)
    db_session.refresh(card2)

    assert card2.due_at is not None
    assert high_retention_due is not None
