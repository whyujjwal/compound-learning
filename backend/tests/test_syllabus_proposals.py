"""Tests for syllabus proposal engine."""


def _create_syllabus(client):
    res = client.post(
        "/api/syllabi",
        json={"slug": "proposal-test", "name": "Proposal Test", "visibility": "PRIVATE"},
    )
    assert res.status_code == 201
    return res.json()


def test_create_and_reject_proposal(client):
    syllabus = _create_syllabus(client)
    syllabus_id = syllabus["id"]

    create = client.post(
        f"/api/syllabi/{syllabus_id}/proposals",
        json={
            "source": "MANUAL",
            "summary": "Add a module",
            "operations": [
                {
                    "id": "op-1",
                    "type": "module.add",
                    "target": {"syllabus_id": syllabus_id},
                    "payload": {"title": "Practice", "objective": "Apply concepts"},
                }
            ],
        },
    )
    assert create.status_code == 201
    proposal = create.json()
    assert proposal["status"] == "READY"
    assert len(proposal["operations"]) == 1

    reject = client.post(f"/api/syllabi/{syllabus_id}/proposals/{proposal['id']}/reject")
    assert reject.status_code == 200
    assert reject.json()["status"] == "REJECTED"

    detail = client.get(f"/api/syllabi/{syllabus_id}")
    assert all(m["title"] != "Practice" for m in detail.json()["modules"])


def test_apply_selected_operations(client):
    syllabus = _create_syllabus(client)
    syllabus_id = syllabus["id"]

    create = client.post(
        f"/api/syllabi/{syllabus_id}/proposals",
        json={
            "source": "MANUAL",
            "summary": "Add materials",
            "operations": [
                {
                    "id": "op-a",
                    "type": "material.add",
                    "target": {"syllabus_id": syllabus_id},
                    "payload": {
                        "title": "Proposal material A",
                        "external_url": "https://example.com/a",
                        "estimated_minutes": 15,
                    },
                },
                {
                    "id": "op-b",
                    "type": "material.add",
                    "target": {"syllabus_id": syllabus_id},
                    "payload": {
                        "title": "Proposal material B",
                        "external_url": "https://example.com/b",
                        "estimated_minutes": 20,
                    },
                },
            ],
        },
    )
    proposal = create.json()

    apply_one = client.post(
        f"/api/syllabi/{syllabus_id}/proposals/{proposal['id']}/apply",
        json={"operation_ids": ["op-a"]},
    )
    assert apply_one.status_code == 200
    assert apply_one.json()["status"] == "APPLIED"
    assert apply_one.json()["applied_operation_ids"] == ["op-a"]

    detail = client.get(f"/api/syllabi/{syllabus_id}").json()
    titles = [m["title"] for mod in detail["modules"] for m in mod["materials"]]
    assert "Proposal material A" in titles
    assert "Proposal material B" not in titles

    history = client.get(f"/api/syllabi/{syllabus_id}/history")
    assert history.status_code == 200
    assert any(entry["operation_type"] == "material.add" for entry in history.json())


def test_conflict_detection(client):
    syllabus = _create_syllabus(client)
    syllabus_id = syllabus["id"]

    create = client.post(
        f"/api/syllabi/{syllabus_id}/proposals",
        json={
            "source": "MANUAL",
            "operations": [
                {
                    "id": "op-conflict",
                    "type": "material.add",
                    "target": {"syllabus_id": syllabus_id},
                    "payload": {"title": "Late add", "estimated_minutes": 10},
                }
            ],
        },
    )
    proposal = create.json()

    client.patch(f"/api/syllabi/{syllabus_id}", json={"name": "Changed name"})

    conflict = client.post(
        f"/api/syllabi/{syllabus_id}/proposals/{proposal['id']}/apply",
        json={"operation_ids": ["op-conflict"]},
    )
    assert conflict.status_code == 409

    forced = client.post(
        f"/api/syllabi/{syllabus_id}/proposals/{proposal['id']}/apply",
        json={"operation_ids": ["op-conflict"], "force": True},
    )
    assert forced.status_code == 200
    assert forced.json()["status"] == "APPLIED"
