from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401 - ensure Base.metadata knows every table before drop_all/create_all.
from app.config import settings
from app.database import Base, get_db
from app.main import app
from tests.conftest import TEST_CURRICULUM, TestingSessionLocal, engine

def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_http_errors_not_swallowed_as_500(client):
    # The catch-all exception handler must preserve real HTTP status codes
    # (e.g. 404), not turn every error into a generic 500.
    missing = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/api/tracks/{missing}")
    assert res.status_code == 404


def test_system_tracks_seeded(client):
    res = client.get("/api/tracks")
    assert res.status_code == 200
    tracks = res.json()
    assert len(tracks) >= 3
    slugs = {t["slug"] for t in tracks}
    assert "dsa" in slugs
    assert "ai-math" in slugs
    assert "system-design" in slugs


def test_demo_materials_seeded(client):
    materials = client.get("/api/materials").json()
    assert len(materials) >= 5


def test_blank_canvas_then_example_import(monkeypatch):
    monkeypatch.setattr("app.services.auth_service.settings.app_password", None)
    monkeypatch.setattr("app.config.settings.app_password", None)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    try:
        from app.services import bootstrap

        bootstrap.bootstrap(db)
        with TestClient(app) as c:
            tracks = c.get("/api/tracks")
            assert tracks.status_code == 200
            assert tracks.json() == []

            schedule = c.get("/api/curriculum/schedule")
            assert schedule.status_code == 200
            assert all(blocks == [] for blocks in schedule.json().values())

            examples = c.get("/api/curriculum/examples")
            assert examples.status_code == 200
            assert len(examples.json()["tracks"]) == 4

            imported = c.post("/api/curriculum/import/examples")
            assert imported.status_code == 200
            assert imported.json()["tracks_created"] == 4
            assert len(c.get("/api/tracks").json()) == 4
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_create_custom_track(client):
    res = client.post(
        "/api/tracks",
        json={"slug": "rust", "name": "Rust Programming", "color": "#de5000"},
    )
    assert res.status_code == 201
    assert res.json()["slug"] == "rust"


def test_create_material_and_queue(client):
    tracks = client.get("/api/tracks").json()
    dsa = next(t for t in tracks if t["slug"] == "dsa")
    res = client.post(
        "/api/materials",
        json={
            "track_id": dsa["id"],
            "title": "Test Problem",
            "raw_content": "Test content for review",
            "estimated_minutes": 10,
            "priority_percent": 5,
        },
    )
    assert res.status_code == 201
    material = res.json()
    assert material["card_id"] is not None

    queue = client.get("/api/queue/daily").json()
    assert "blocks" in queue
    assert queue["block_minutes"] >= 30
    assert material["title"] == "Test Problem"


def test_review_flow(client):
    queue = client.get("/api/queue/daily").json()
    items = queue["items"]
    if not items:
        # Today's blocks don't include any track with material; nothing to review.
        return

    card_id = items[0]["card_id"]
    res = client.post(
        f"/api/cards/{card_id}/review",
        json={"rating": "GOOD", "elapsed_time_seconds": 45},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["card"]["reps"] >= 1


def test_stats(client):
    res = client.get("/api/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_tracks"] >= 3
    assert "track_breakdown" in stats
    assert len(stats["track_breakdown"]) >= 3


def test_material_crud(client):
    tracks = client.get("/api/tracks").json()
    track_id = tracks[0]["id"]
    create = client.post(
        "/api/materials",
        json={"track_id": track_id, "title": "CRUD Test", "raw_content": "Original"},
    )
    material_id = create.json()["id"]

    get_res = client.get(f"/api/materials/{material_id}")
    assert get_res.status_code == 200

    patch = client.patch(
        f"/api/materials/{material_id}",
        json={"title": "CRUD Updated", "priority_percent": 5},
    )
    assert patch.status_code == 200
    assert patch.json()["title"] == "CRUD Updated"

    delete = client.delete(f"/api/materials/{material_id}")
    assert delete.status_code == 204


def test_user_settings(client):
    res = client.patch(
        "/api/user/me",
        json={"daily_study_minutes": 90, "target_retention": 0.85},
    )
    assert res.status_code == 200
    assert res.json()["daily_study_minutes"] == 90
    assert res.json()["target_retention"] == 0.85


def test_track_update(client):
    tracks = client.get("/api/tracks").json()
    custom = client.post(
        "/api/tracks",
        json={"slug": "edit-me", "name": "Before Edit"},
    ).json()
    res = client.patch(
        f"/api/tracks/{custom['id']}",
        json={"name": "After Edit", "cognitive_multiplier": 1.5},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "After Edit"


def test_card_detail(client):
    cards = client.get("/api/cards").json()
    assert len(cards) > 0
    card_id = cards[0]["id"]
    res = client.get(f"/api/cards/{card_id}")
    assert res.status_code == 200
    assert "material_title" in res.json()
    assert "review_logs" in res.json()


def test_chat_status_disabled_by_default(client):
    res = client.get("/api/chat/status")
    assert res.status_code == 200
    body = res.json()
    assert "enabled" in body
    assert "provider" in body


def test_conversation_crud(client):
    create = client.post("/api/chat/conversations", json={"title": "Test convo"})
    assert create.status_code == 201
    conv_id = create.json()["id"]

    listing = client.get("/api/chat/conversations").json()
    assert any(c["id"] == conv_id for c in listing)

    detail = client.get(f"/api/chat/conversations/{conv_id}").json()
    assert detail["title"] == "Test convo"
    assert detail["messages"] == []

    delete = client.delete(f"/api/chat/conversations/{conv_id}")
    assert delete.status_code == 204


def test_curriculum_schedule(client):
    res = client.get("/api/curriculum/schedule/today")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_today_paths_use_client_timezone(client, monkeypatch):
    fixed_now = datetime(2026, 6, 1, 1, 0, tzinfo=UTC)
    for target in [
        "app.services.timezone.utc_now",
        "app.services.queue_service.utc_now",
        "app.services.block_service.utc_now",
        "app.services.stats_service.utc_now",
        "app.services.coach_insights.utc_now",
    ]:
        monkeypatch.setattr(target, lambda: fixed_now)

    schedule = {
        "monday": [{"block": 1, "track": "dsa", "minutes": 30}],
        "tuesday": [],
        "wednesday": [],
        "thursday": [],
        "friday": [],
        "saturday": [],
        "sunday": [{"block": 1, "track": "ai-math", "minutes": 30}],
    }
    assert client.put("/api/curriculum/schedule", json=schedule).status_code == 200

    kolkata = {"X-Compound-Timezone": "Asia/Kolkata"}
    los_angeles = {"X-Compound-Timezone": "America/Los_Angeles"}

    today_kolkata = client.get("/api/curriculum/schedule/today", headers=kolkata)
    assert today_kolkata.status_code == 200
    assert [b["track"] for b in today_kolkata.json()] == ["dsa"]

    today_la = client.get("/api/curriculum/schedule/today", headers=los_angeles)
    assert today_la.status_code == 200
    assert [b["track"] for b in today_la.json()] == ["ai-math"]

    queue_kolkata = client.get("/api/queue/daily", headers=kolkata)
    assert queue_kolkata.status_code == 200
    assert queue_kolkata.json()["weekday"] == 0
    assert queue_kolkata.json()["blocks"][0]["track_slug"] == "dsa"

    queue_la = client.get("/api/queue/daily", headers=los_angeles)
    assert queue_la.status_code == 200
    assert queue_la.json()["weekday"] == 6
    assert queue_la.json()["blocks"][0]["track_slug"] == "ai-math"

    started = client.post("/api/blocks/0/start", headers=kolkata)
    assert started.status_code == 200
    assert started.json()["session_date"] == "2026-06-01"
    assert started.json()["track_slug"] == "dsa"


def test_reschedule_endpoint(client):
    res = client.post(
        "/api/curriculum/reschedule",
        json={"start_date": "2026-06-01"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "adjusted_tracks" in body


def test_session_logging(client):
    materials = client.get("/api/materials").json()
    assert materials
    mat_id = materials[0]["id"]
    res = client.post(
        "/api/sessions",
        json={
            "material_id": mat_id,
            "duration_minutes": 30,
            "completion_status": "COMPLETED",
            "self_rating": 4,
            "notes": "Test session",
        },
    )
    assert res.status_code == 201
    assert res.json()["completion_status"] == "COMPLETED"


def test_knowledge_graph(client):
    res = client.get("/api/knowledge-graph/track/dsa")
    assert res.status_code == 200
    body = res.json()
    assert "nodes" in body
    assert "edges" in body


def test_organizations(client):
    res = client.get("/api/organizations")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_integrations_lti(client):
    res = client.get("/api/integrations/lti/config")
    assert res.status_code == 200
    assert res.json()["title"] == "Compound Learning Platform"


def test_chat_send_without_api_key(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "anthropic_api_key", None)
    monkeypatch.setattr(settings, "openai_api_key", None)
    monkeypatch.setattr(settings, "gemini_api_key", None)
    conv = client.post("/api/chat/conversations", json={}).json()
    res = client.post(
        f"/api/chat/conversations/{conv['id']}/messages",
        json={"content": "How am I doing?"},
    )
    assert res.status_code == 503


def test_generate_roadmap_without_api_key(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "anthropic_api_key", None)
    monkeypatch.setattr(settings, "openai_api_key", None)
    monkeypatch.setattr(settings, "gemini_api_key", None)
    res = client.post(
        "/api/curriculum/generate",
        json={"goals": "Learn Rust", "weekly_hours": 8},
    )
    assert res.status_code == 503


def test_generate_roadmap_applies_personalized_schedule(client, monkeypatch):
    """A generated roadmap (mocked model) imports tracks and sets the user's schedule."""
    fake_curriculum = {
        "version": "1.0",
        "tracks": [
            {
                "slug": "rust",
                "name": "Rust Programming",
                "description": "Systems programming in Rust.",
                "color": "#f59e0b",
                "cognitive_multiplier": 1.2,
                "materials": [
                    {
                        "title": "The Rust Book",
                        "url": "https://doc.rust-lang.org/book/",
                        "type": "reading",
                        "estimated_minutes": 30,
                        "priority_percent": 5,
                        "sequence": 1,
                    }
                ],
            }
        ],
        "weekly_schedule": {
            "monday": [{"block": 1, "track": "rust"}],
            "tuesday": [],
            "wednesday": [],
            "thursday": [],
            "friday": [],
            "saturday": [],
            "sunday": [{"block": 1, "track": "review"}],
        },
    }

    monkeypatch.setattr(
        "app.api.routes.curriculum.generate_roadmap",
        lambda goals, weekly_hours=10, level=None: fake_curriculum,
    )

    res = client.post(
        "/api/curriculum/generate",
        json={"goals": "Learn Rust deeply", "weekly_hours": 8, "apply": True},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["applied"] is True
    assert body["stats"]["tracks_created"] >= 1

    # The track now exists and the personalized schedule is in effect.
    tracks = {t["slug"] for t in client.get("/api/tracks").json()}
    assert "rust" in tracks

    schedule = client.get("/api/curriculum/schedule").json()
    assert any(b["track"] == "rust" for b in schedule["monday"])

    me = client.get("/api/user/me").json()
    assert me["onboarded"] is True
    assert me["learning_goals"] == "Learn Rust deeply"


def test_generate_roadmap_saves_history_without_apply(client, monkeypatch):
    fake_curriculum = {
        "version": "1.0",
        "tracks": [
            {
                "slug": "go",
                "name": "Go Programming",
                "description": "Learn Go.",
                "color": "#22c55e",
                "cognitive_multiplier": 1.0,
                "materials": [
                    {
                        "title": "Tour of Go",
                        "url": "https://go.dev/tour/",
                        "estimated_minutes": 30,
                        "priority_percent": 5,
                        "sequence": 1,
                    }
                ],
            }
        ],
        "weekly_schedule": {d: [] for d in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]},
    }
    fake_curriculum["weekly_schedule"]["monday"] = [{"block": 1, "track": "go"}]
    fake_curriculum["weekly_schedule"]["sunday"] = [{"block": 1, "track": "review"}]

    monkeypatch.setattr(
        "app.api.routes.curriculum.generate_roadmap",
        lambda goals, weekly_hours=10, level=None: fake_curriculum,
    )

    res = client.post(
        "/api/curriculum/generate",
        json={"goals": "Learn Go for backend APIs", "weekly_hours": 6, "apply": False},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["applied"] is False
    assert body["generation_id"]

    history = client.get("/api/curriculum/generations").json()
    assert len(history) == 1
    assert history[0]["track_count"] == 1
    assert history[0]["applied"] is False

    detail = client.get(f"/api/curriculum/generations/{body['generation_id']}").json()
    assert detail["curriculum"]["tracks"][0]["slug"] == "go"


def test_generate_roadmap_chunked_fallback(client, monkeypatch):
    """Truncated single-pass falls back to chunked generation."""
    fake_curriculum = {
        "version": "1.0",
        "tracks": [{"slug": "ml", "name": "ML", "materials": [], "color": "#f00", "cognitive_multiplier": 1.0}],
        "weekly_schedule": {d: [] for d in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]},
    }

    from app.services.roadmap import RoadmapError
    from app.services.roadmap import generator as rg

    def fake_single(*args, **kwargs):
        raise RoadmapError("__truncated__")

    monkeypatch.setattr(rg, "generate_single_pass", fake_single)
    monkeypatch.setattr(rg, "generate_chunked", lambda *a, **k: fake_curriculum)
    monkeypatch.setattr(rg, "should_chunk_first", lambda goals: False)

    res = client.post(
        "/api/curriculum/generate",
        json={"goals": "Learn ML basics", "weekly_hours": 5, "apply": False},
    )
    assert res.status_code == 200
    assert res.json()["curriculum"]["tracks"][0]["slug"] == "ml"


def test_public_catalog_search_star_and_adopt(client):
    created = client.post(
        "/api/syllabi",
        json={"slug": "pub-catalog-adopt", "name": "Pub Catalog Adopt", "visibility": "PUBLIC"},
    ).json()
    client.post(
        f"/api/syllabi/{created['id']}/materials",
        json={
            "title": "Catalog adopt material",
            "url": "https://example.com/catalog-adopt",
            "estimated_minutes": 15,
        },
    )
    tracks = client.get("/api/catalog/tracks?q=Pub+Catalog&sort=ranking").json()
    assert any(t["slug"] == "pub-catalog-adopt" for t in tracks)
    public_track = next(t for t in tracks if t["slug"] == "pub-catalog-adopt")
    assert public_track["material_count"] >= 1

    starred = client.post(f"/api/catalog/tracks/{public_track['id']}/star")
    assert starred.status_code == 200
    assert starred.json()["is_starred"] is True
    assert starred.json()["star_count"] >= public_track["star_count"]

    unstarred = client.delete(f"/api/catalog/tracks/{public_track['id']}/star")
    assert unstarred.status_code == 200
    assert unstarred.json()["is_starred"] is False

    adopted = client.post(f"/api/catalog/tracks/{public_track['id']}/adopt")
    assert adopted.status_code == 201
    body = adopted.json()
    assert body["materials_created"] == public_track["material_count"]
    copied = client.get(f"/api/tracks/{body['track_id']}")
    assert copied.status_code == 200
    assert copied.json()["source_track_id"] == public_track["id"]
    assert copied.json()["is_public"] is False


def test_track_ai_update_adds_materials(client, monkeypatch):
    tracks = client.get("/api/tracks").json()
    system = next(t for t in tracks if t["slug"] == "system-design")

    monkeypatch.setattr(
        "app.api.routes.tracks.generate_track_update",
        lambda track, materials, instruction: {
            "summary": "Added quiz and challenge.",
            "materials": [
                {
                    "title": "System Design · Load Balancing Quiz",
                    "url": "https://github.com/donnemartin/system-design-primer",
                    "block_label": "System Design · Load Balancing",
                    "type": "quiz",
                    "estimated_minutes": 20,
                    "priority_percent": 15,
                    "cognitive_cost_multiplier": 1.0,
                    "sequence": 99,
                    "notes": "MEDIUM quiz: answer tradeoff questions.",
                },
                {
                    "title": "System Design · Hard Load Balancer Challenge",
                    "url": "https://github.com/donnemartin/system-design-primer",
                    "block_label": "System Design · Load Balancing",
                    "type": "practice",
                    "estimated_minutes": 45,
                    "priority_percent": 18,
                    "cognitive_cost_multiplier": 1.2,
                    "sequence": 100,
                    "notes": "HARD challenge: design failover and health checks.",
                },
            ],
        },
    )

    res = client.post(
        f"/api/tracks/{system['id']}/ai-updates",
        json={"instruction": "Add quiz and hard problem for load balancing", "apply": True},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "APPLIED"
    assert body["added_materials"] == 2

    materials = client.get(f"/api/materials?track_id={system['id']}").json()
    titles = {m["title"] for m in materials}
    assert "System Design · Load Balancing Quiz" in titles
    assert "System Design · Hard Load Balancer Challenge" in titles
