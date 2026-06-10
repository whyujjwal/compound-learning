"""Gamification engine: XP, levels, and achievements."""

from datetime import UTC, datetime, timedelta

from app.models.card import Card
from app.models.review_log import ReviewLog, ReviewRating
from app.models.user_achievement import UserAchievement
from app.services import gamification_service as gs
from app.services.bootstrap import get_default_user


# ---------------------------------------------------------------- pure level math


def test_xp_for_level_boundaries():
    assert gs.xp_for_level(1) == 0
    assert gs.xp_for_level(2) == 100
    assert gs.xp_for_level(3) == 300
    assert gs.xp_for_level(4) == 600
    assert gs.xp_for_level(5) == 1000


def test_level_for_xp_at_and_around_boundaries():
    assert gs.level_for_xp(0) == 1
    assert gs.level_for_xp(99) == 1
    assert gs.level_for_xp(100) == 2
    assert gs.level_for_xp(299) == 2
    assert gs.level_for_xp(300) == 3
    assert gs.level_for_xp(1000) == 5


def test_level_for_xp_is_monotonic():
    last = 1
    for xp in range(0, 5000, 37):
        lvl = gs.level_for_xp(xp)
        assert lvl >= last
        last = lvl


def test_level_progress_splits_into_and_span():
    level, into, span = gs.level_progress(150)
    assert level == 2
    assert into == 50  # 150 - xp_for_level(2)=100
    assert span == 200  # xp_for_level(3)-xp_for_level(2) = 300-100
    assert 0 <= into < span


# ---------------------------------------------------------------- XP awarding


def test_award_review_xp_default():
    class U:
        xp_total = 0

    u = U()
    awarded = gs.award_review_xp(u, is_first_review=False)
    assert awarded == gs.XP_PER_REVIEW == 10
    assert u.xp_total == 10


def test_award_review_xp_first_review_adds_discovery_bonus():
    class U:
        xp_total = 40

    u = U()
    awarded = gs.award_review_xp(u, is_first_review=True)
    assert awarded == gs.XP_PER_REVIEW + gs.XP_DISCOVERY_BONUS == 20
    assert u.xp_total == 60


# ---------------------------------------------------------------- achievement catalog (pure)


def test_catalog_is_nonempty_and_slugs_unique():
    slugs = [a.slug for a in gs.ACHIEVEMENTS]
    assert len(slugs) >= 12
    assert len(slugs) == len(set(slugs))


def test_satisfied_slugs_volume_thresholds():
    metrics = {"reviews_total": 100}
    satisfied = gs.satisfied_slugs(metrics)
    assert "first_review" in satisfied
    assert "reviews_10" in satisfied
    assert "reviews_100" in satisfied
    assert "reviews_500" not in satisfied


def test_satisfied_slugs_retention_requires_minimum_reviews():
    # High retention but too few reviews -> not credited (noise guard).
    assert "retention_90" not in gs.satisfied_slugs({"retention_pct": 95, "reviews_total": 10})
    # Same retention with enough reviews -> credited.
    assert "retention_90" in gs.satisfied_slugs({"retention_pct": 95, "reviews_total": 60})


# ---------------------------------------------------------------- evaluation (integration)


def _log_review(db, user, rating=ReviewRating.GOOD, when=None):
    card = db.query(Card).filter(Card.user_id == user.id).first()
    log = ReviewLog(
        card_id=card.id,
        rating=rating,
        elapsed_time_seconds=30,
        actual_interval_days=0,
        scheduled_interval_days=1,
        reviewed_at=(when or datetime.now(UTC)).replace(tzinfo=None),
    )
    db.add(log)
    db.commit()
    return log


def _reset_achievements(db, user):
    """Per-test isolation: the default user is shared and accumulates unlocks."""
    db.query(UserAchievement).filter(UserAchievement.user_id == user.id).delete()
    db.commit()


def test_evaluate_unlocks_first_review(db_session):
    user = get_default_user(db_session)
    _reset_achievements(db_session, user)
    _log_review(db_session, user)
    newly = gs.evaluate_achievements(db_session, user)
    slugs = {a.slug for a in newly}
    assert "first_review" in slugs
    rows = (
        db_session.query(UserAchievement)
        .filter(UserAchievement.user_id == user.id, UserAchievement.slug == "first_review")
        .count()
    )
    assert rows == 1


def test_evaluate_is_idempotent(db_session):
    user = get_default_user(db_session)
    _reset_achievements(db_session, user)
    _log_review(db_session, user)
    gs.evaluate_achievements(db_session, user)
    newly_second = gs.evaluate_achievements(db_session, user)
    assert newly_second == []  # nothing new the second time
    rows = (
        db_session.query(UserAchievement)
        .filter(UserAchievement.user_id == user.id, UserAchievement.slug == "first_review")
        .count()
    )
    assert rows == 1  # no duplicate


def test_evaluate_does_not_consume_streak_freeze(db_session):
    """Awarding/evaluating must never silently burn a streak freeze."""
    user = get_default_user(db_session)
    user.streak_freeze_remaining = 1
    db_session.commit()
    # A gap pattern that the buggy read path would try to bridge:
    today = datetime.now(UTC)
    _log_review(db_session, user, when=today)
    _log_review(db_session, user, when=today - timedelta(days=2))
    gs.evaluate_achievements(db_session, user)
    db_session.refresh(user)
    assert user.streak_freeze_remaining == 1


# ---------------------------------------------------------------- profile view


def test_review_card_awards_xp_and_returns_unlocks(db_session):
    """review_card is the single choke-point: it must award XP and report unlocks."""
    from app.services.fsrs_service import review_card

    user = get_default_user(db_session)
    user.xp_total = 0
    db_session.commit()

    card = (
        db_session.query(Card)
        .filter(Card.user_id == user.id, Card.last_reviewed_at.is_(None))
        .first()
    )
    assert card is not None, "expected at least one un-reviewed seeded card"

    result = review_card(db_session, card, user, ReviewRating.GOOD, 30)
    assert len(result) == 5  # card, log, actual_days, scheduled_days, newly_unlocked
    _card, _log, _actual, _scheduled, newly = result

    db_session.refresh(user)
    # New card -> base 10 + discovery 10.
    assert user.xp_total == 20
    assert isinstance(newly, list)


def test_get_profile_shape(db_session):
    user = get_default_user(db_session)
    user.xp_total = 150
    db_session.commit()
    profile = gs.get_profile(db_session, user)
    assert profile["xp_total"] == 150
    assert profile["level"] == 2
    assert profile["level_xp_into"] == 50
    assert profile["level_xp_span"] == 200
    assert isinstance(profile["achievements"], list)
    sample = profile["achievements"][0]
    for key in ("slug", "title", "icon", "category", "unlocked", "progress"):
        assert key in sample
