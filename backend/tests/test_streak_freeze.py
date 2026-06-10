"""Streak freeze grace-day tests."""

from datetime import UTC, datetime, timedelta

from app.services.bootstrap import get_default_user
from app.services.stats_service import _compute_streaks
from app.services.timezone import local_today


def test_streak_freeze_bridges_one_missed_day(db_session):
    learner = get_default_user(db_session)
    learner.streak_freeze_remaining = 1
    today = local_today(None, learner)
    yesterday = today - timedelta(days=1)
    two_days_ago = today - timedelta(days=2)

    # Reviews today and two days ago — missed yesterday.
    dates = [
        datetime.combine(today, datetime.min.time()).replace(tzinfo=UTC),
        datetime.combine(two_days_ago, datetime.min.time()).replace(tzinfo=UTC),
    ]
    current, longest = _compute_streaks(dates, None, learner)
    assert current >= 2
    assert learner.streak_freeze_remaining == 0


def test_streak_increments_on_review_day(db_session):
    learner = get_default_user(db_session)
    today = local_today(None, learner)
    dates = [datetime.combine(today, datetime.min.time()).replace(tzinfo=UTC)]
    current, _ = _compute_streaks(dates, None, learner)
    assert current == 1
