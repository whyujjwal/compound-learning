"""API surface for gamification: profile endpoint + stats embedding + review response."""


def test_gamification_profile_endpoint(client):
    resp = client.get("/api/gamification/profile")
    assert resp.status_code == 200
    data = resp.json()
    assert "xp_total" in data
    assert "level" in data
    assert "level_xp_into" in data
    assert "level_xp_span" in data
    assert data["achievements_total"] >= 12
    assert isinstance(data["achievements"], list)
    assert len(data["achievements"]) == data["achievements_total"]


def test_stats_includes_xp_and_level(client):
    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "xp_total" in data
    assert "level" in data
    assert data["level"] >= 1


def test_review_response_carries_gamification(client):
    # Grab a card and review it; the response should include xp + level + unlock list.
    cards = client.get("/api/cards").json()
    assert cards, "expected seeded cards"
    card_id = cards[0]["id"]
    resp = client.post(f"/api/cards/{card_id}/review", json={"rating": "GOOD", "elapsed_time_seconds": 12})
    assert resp.status_code == 200
    data = resp.json()
    assert data["xp_total"] >= 10
    assert data["level"] >= 1
    assert isinstance(data["newly_unlocked"], list)
    # First review of a fresh account unlocks "First Step".
    assert any(a["slug"] == "first_review" for a in data["newly_unlocked"])
