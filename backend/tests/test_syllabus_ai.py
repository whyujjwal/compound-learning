"""Tests for AI syllabus proposals."""

from unittest.mock import patch


def _create_syllabus(client):
    res = client.post(
        "/api/syllabi",
        json={"slug": "ai-proposal-test", "name": "AI Proposal Test", "visibility": "PRIVATE"},
    )
    assert res.status_code == 201
    return res.json()


MOCK_AI_RESULT = {
    "summary": "Added a project checkpoint.",
    "materials": [
        {
            "title": "Build a rate limiter project",
            "url": "https://redis.io/docs/latest/develop/",
            "block_label": "AI Proposal Test · Practice",
            "type": "project",
            "estimated_minutes": 90,
            "priority_percent": 20,
            "notes": "Hands-on Redis rate limiter.",
        }
    ],
}


def test_create_ai_proposal(client):
    syllabus = _create_syllabus(client)
    syllabus_id = syllabus["id"]

    with patch(
        "app.domains.syllabus.proposals.generate_track_update",
        return_value=MOCK_AI_RESULT,
    ):
        res = client.post(
            f"/api/syllabi/{syllabus_id}/proposals/ai",
            json={"instruction": "Add a hard project about rate limiting"},
        )

    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "READY"
    assert body["source"] == "AI"
    assert len(body["operations"]) == 1
    assert body["operations"][0]["type"] == "material.add"

    detail = client.get(f"/api/syllabi/{syllabus_id}")
    assert all(
        m["title"] != "Build a rate limiter project"
        for mod in detail.json()["modules"]
        for m in mod["materials"]
    )


def test_track_ai_update_creates_proposal_by_default(client, monkeypatch):
    tracks = client.get("/api/tracks").json()
    system = next(t for t in tracks if t["slug"] == "system-design")

    monkeypatch.setattr(
        "app.domains.syllabus.proposals.generate_track_update",
        lambda track, materials, instruction: MOCK_AI_RESULT,
    )

    res = client.post(
        f"/api/tracks/{system['id']}/ai-updates",
        json={"instruction": "Add rate limiter project"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "READY"
    assert body["result"]["proposal_id"]
    assert body["added_materials"] == 0


def test_list_materials_pagination(client):
    syllabus = _create_syllabus(client)
    syllabus_id = syllabus["id"]

    for i in range(3):
        client.post(
            f"/api/syllabi/{syllabus_id}/materials",
            json={"title": f"Material {i}", "external_url": f"https://example.com/{i}"},
        )

    page = client.get(f"/api/syllabi/{syllabus_id}/materials?limit=2&offset=0")
    assert page.status_code == 200
    body = page.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2
    assert body["limit"] == 2
