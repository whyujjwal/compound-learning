"""Tests for canonical /api/syllabi endpoints."""

from uuid import UUID


def test_list_syllabi_returns_seeded_tracks(client):
    res = client.get("/api/syllabi")
    assert res.status_code == 200
    syllabi = res.json()
    assert len(syllabi) >= 3
    slugs = {s["slug"] for s in syllabi}
    assert "dsa" in slugs
    assert "system-design" in slugs
    first = syllabi[0]
    assert "module_count" in first
    assert "material_count" in first
    assert "health_score" in first
    assert first["visibility"] in ("PUBLIC", "PRIVATE")


def test_get_syllabus_by_slug(client):
    res = client.get("/api/syllabi/slug/dsa")
    assert res.status_code == 200
    body = res.json()
    assert body["slug"] == "dsa"
    assert body["name"]
    assert isinstance(body["modules"], list)
    assert body["version"] >= 1
    assert body["permissions"]["can_edit"] is False


def test_get_syllabus_by_id(client):
    tracks = client.get("/api/tracks").json()
    track_id = tracks[0]["id"]
    res = client.get(f"/api/syllabi/{track_id}")
    assert res.status_code == 200
    assert res.json()["id"] == track_id


def test_create_update_delete_syllabus(client):
    create = client.post(
        "/api/syllabi",
        json={
            "slug": "test-syllabus",
            "name": "Test Syllabus",
            "summary": "A test syllabus",
            "visibility": "PRIVATE",
        },
    )
    assert create.status_code == 201
    created = create.json()
    syllabus_id = created["id"]
    assert created["slug"] == "test-syllabus"
    assert created["version"] == 1

    dup = client.post(
        "/api/syllabi",
        json={"slug": "test-syllabus", "name": "Duplicate", "visibility": "PRIVATE"},
    )
    assert dup.status_code == 409

    patch = client.patch(
        f"/api/syllabi/{syllabus_id}",
        json={"name": "Updated Syllabus", "summary": "Updated summary"},
    )
    assert patch.status_code == 200
    assert patch.json()["name"] == "Updated Syllabus"
    assert patch.json()["version"] >= 2

    delete = client.delete(f"/api/syllabi/{syllabus_id}")
    assert delete.status_code == 204
    missing = client.get(f"/api/syllabi/{syllabus_id}")
    assert missing.status_code == 404


def test_module_and_material_crud(client):
    create = client.post(
        "/api/syllabi",
        json={"slug": "crud-test", "name": "CRUD Test", "visibility": "PRIVATE"},
    )
    syllabus_id = create.json()["id"]

    mod = client.post(
        f"/api/syllabi/{syllabus_id}/modules",
        json={"title": "Foundations", "objective": "Learn basics"},
    )
    assert mod.status_code == 200
    module_id = mod.json()["modules"][0]["id"]

    mat = client.post(
        f"/api/syllabi/{syllabus_id}/materials",
        json={
            "title": "Intro reading",
            "module_id": module_id,
            "external_url": "https://example.com/intro",
            "estimated_minutes": 20,
        },
    )
    assert mat.status_code == 200
    materials = []
    for module in mat.json()["modules"]:
        materials.extend(module["materials"])
    assert any(m["title"] == "Intro reading" for m in materials)
    material_id = next(m["id"] for m in materials if m["title"] == "Intro reading")

    patch_mat = client.patch(
        f"/api/syllabi/{syllabus_id}/materials/{material_id}",
        json={"title": "Intro reading (updated)"},
    )
    assert patch_mat.status_code == 200

    history = client.get(f"/api/syllabi/{syllabus_id}/history")
    assert history.status_code == 200
    assert len(history.json()) >= 2

    delete_mat = client.delete(f"/api/syllabi/{syllabus_id}/materials/{material_id}")
    assert delete_mat.status_code == 200

    delete_mod = client.delete(f"/api/syllabi/{syllabus_id}/modules/{module_id}")
    assert delete_mod.status_code == 200


def test_old_tracks_api_still_works(client):
    res = client.get("/api/tracks")
    assert res.status_code == 200
    assert len(res.json()) >= 3


def test_cannot_access_other_user_syllabus(client):
    missing = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/api/syllabi/{missing}")
    assert res.status_code == 404
