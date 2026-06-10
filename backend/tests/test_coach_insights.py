"""Coach insights stay useful without an AI key (deterministic stats fallback)."""

from app.config import settings
from app.services import coach_insights as ci


def _disable_ai(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    monkeypatch.setattr(settings, "openai_api_key", None)
    monkeypatch.setattr(settings, "gemini_api_key", None)


# ---------------------------------------------------------------- pure fallbacks


def test_fallback_daily_names_due_topic():
    snap = {
        "due_reviews": 5,
        "topics_due": [{"track": "DSA", "cards": 5}],
        "current_streak": 0,
        "top_struggles": [],
        "available_tracks": ["DSA"],
        "reviews_yesterday": 0,
    }
    text = ci._fallback_daily(snap)
    assert "DSA" in text
    assert "5" in text


def test_fallback_daily_first_step_when_empty():
    snap = {
        "due_reviews": 0,
        "topics_due": [],
        "current_streak": 0,
        "top_struggles": [],
        "available_tracks": ["AI Math"],
        "reviews_yesterday": 0,
    }
    text = ci._fallback_daily(snap)
    assert text
    assert "AI Math" in text


def test_fallback_weekly_zero_week_is_gentle_restart():
    snap = {
        "reviews_this_week": 0,
        "reviews_prev_week": 0,
        "retention_pct": 0,
        "total_minutes_invested": 0,
        "days_active_30d": 0,
        "top_struggles": [],
        "available_tracks": ["DSA"],
    }
    text = ci._fallback_weekly(snap)
    assert text
    assert "DSA" in text


def test_fallback_weekly_summarizes_numbers():
    snap = {
        "reviews_this_week": 40,
        "reviews_prev_week": 20,
        "retention_pct": 88.0,
        "total_minutes_invested": 300,
        "days_active_30d": 12,
        "top_struggles": [{"title": "CAP theorem", "lapses": 3}],
        "available_tracks": ["System Design"],
    }
    text = ci._fallback_weekly(snap)
    assert "40" in text
    assert "88" in text


# ---------------------------------------------------------------- endpoints


def test_daily_insight_endpoint_works_without_ai(client, monkeypatch):
    _disable_ai(monkeypatch)
    resp = client.get("/api/chat/insights/daily")
    assert resp.status_code == 200
    data = resp.json()
    assert data["content"]
    assert data["model"] == "stats-fallback"


def test_weekly_insight_endpoint_works_without_ai(client, monkeypatch):
    _disable_ai(monkeypatch)
    resp = client.get("/api/chat/insights/weekly")
    assert resp.status_code == 200
    data = resp.json()
    assert data["content"]
    assert data["model"] == "stats-fallback"


def test_daily_snapshot_includes_gamification(client, monkeypatch):
    _disable_ai(monkeypatch)
    resp = client.get("/api/chat/insights/daily")
    metrics = resp.json()["metrics"]
    assert "level" in metrics
    assert "current_streak" in metrics
