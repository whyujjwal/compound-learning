import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.main import app

engine = create_engine(settings.database_url, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def client(monkeypatch):
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

    from app.services import bootstrap
    from app.services.bootstrap import get_default_user
    from app.services.curriculum_loader import import_curriculum

    bootstrap.bootstrap(db)
    user = get_default_user(db)
    import_curriculum(
        db,
        user,
        {
            "tracks": [
                {
                    "slug": "dsa",
                    "name": "Data Structures & Algorithms",
                    "color": "#22c55e",
                    "materials": [
                        {
                            "title": "Two Sum (test)",
                            "url": "https://leetcode.com/problems/two-sum/",
                            "block_label": "DSA · Test",
                            "estimated_minutes": 25,
                            "priority_percent": 10,
                            "notes": "Test material.",
                        },
                        {
                            "title": "Sliding Window Maximum (test)",
                            "url": "https://leetcode.com/problems/sliding-window-maximum/",
                            "block_label": "DSA · Test",
                            "estimated_minutes": 40,
                            "priority_percent": 12,
                        },
                    ],
                },
                {
                    "slug": "ai-math",
                    "name": "Mathematics for AI",
                    "color": "#a87f9e",
                    "materials": [
                        {
                            "title": "Gradient intuition (test)",
                            "url": "https://www.3blue1brown.com/",
                            "block_label": "Math · Test",
                            "estimated_minutes": 20,
                            "priority_percent": 14,
                        },
                        {
                            "title": "Bayes rule (test)",
                            "url": "https://www.youtube.com/",
                            "block_label": "Math · Test",
                            "estimated_minutes": 25,
                            "priority_percent": 18,
                        },
                    ],
                },
                {
                    "slug": "system-design",
                    "name": "System Design",
                    "color": "#0ea5e9",
                    "materials": [
                        {
                            "title": "CAP theorem (test)",
                            "url": "https://example.com",
                            "block_label": "SD · Test",
                            "estimated_minutes": 20,
                            "priority_percent": 16,
                        },
                        {
                            "title": "Load balancing (test)",
                            "url": "https://example.com",
                            "block_label": "SD · Test",
                            "estimated_minutes": 25,
                            "priority_percent": 22,
                        },
                    ],
                },
            ]
        },
    )

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    db.close()


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

    from app.services import roadmap_generator as rg

    def fake_single(*args, **kwargs):
        raise rg.RoadmapError("__truncated__")

    monkeypatch.setattr(rg, "_generate_single_pass", fake_single)
    monkeypatch.setattr(rg, "_generate_chunked", lambda *a, **k: fake_curriculum)
    monkeypatch.setattr(rg, "_should_chunk_first", lambda goals: False)

    res = client.post(
        "/api/curriculum/generate",
        json={"goals": "Learn ML basics", "weekly_hours": 5, "apply": False},
    )
    assert res.status_code == 200
    assert res.json()["curriculum"]["tracks"][0]["slug"] == "ml"
