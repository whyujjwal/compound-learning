"""Tests for link verification and the AI sourcing pipeline."""

from app.domains.course import link_check
from app.domains.course import source_registry
from app.domains.course import sourcing_service


def test_verify_url_rejects_non_http():
    status, score = link_check.verify_url("ftp://example.com/file")
    assert status == "BROKEN"
    assert score == 0.0


def test_verify_url_ok_when_fetch_succeeds(monkeypatch):
    monkeypatch.setattr(link_check, "_head_status", lambda url, timeout: 200)
    status, score = link_check.verify_url("https://example.com/page")
    assert status == "OK"
    assert score > 0.0


def test_verify_url_broken_on_404(monkeypatch):
    monkeypatch.setattr(link_check, "_head_status", lambda url, timeout: 404)
    status, score = link_check.verify_url("https://example.com/missing")
    assert status == "BROKEN"


def test_classify_known_source():
    provider, license_name, trusted = source_registry.classify_source("https://ocw.mit.edu/courses/x")
    assert provider == "MIT OpenCourseWare"
    assert trusted is True


def test_classify_unknown_source_is_untrusted():
    provider, license_name, trusted = source_registry.classify_source("https://random-blog.example/post")
    assert trusted is False


SAMPLE_DRAFT = {
    "summary": "Intro to graphs",
    "modules": [
        {
            "title": "Graph Basics", "objective": "represent graphs", "kind": "core",
            "learning_outcomes": ["Explain adjacency list vs matrix"],
            "sections": [
                {
                    "title": "Representations", "kind": "core",
                    "materials": [
                        {"title": "Graph intro video", "url": "https://www.youtube.com/watch?v=x",
                         "resource_type": "video", "estimated_minutes": 15},
                        {"title": "Sketchy blog", "url": "https://random-blog.example/p",
                         "resource_type": "article", "estimated_minutes": 10},
                    ],
                }
            ],
        }
    ],
}


def test_generate_structure_calls_model(monkeypatch):
    monkeypatch.setattr(sourcing_service, "call_model_json", lambda system, prompt, **k: SAMPLE_DRAFT)
    draft = sourcing_service.generate_structure("learn graphs", level="beginner", hours=5)
    assert draft["modules"][0]["title"] == "Graph Basics"


def test_draft_to_operations_keeps_structure_drops_bad_links(monkeypatch):
    def fake_verify(url, **k):
        return ("OK", 0.9) if "youtube" in url else ("BROKEN", 0.0)

    monkeypatch.setattr(sourcing_service, "verify_url", fake_verify)

    ops = sourcing_service.draft_to_operations(SAMPLE_DRAFT)
    types = [o.type for o in ops]
    assert "module.add" in types
    assert "section.add" in types
    material_ops = [o for o in ops if o.type == "material.add"]
    assert len(material_ops) == 1
    assert material_ops[0].payload["provider"] == "YouTube"
    assert material_ops[0].payload["resource_health_status"] == "OK"


def test_generate_endpoint_creates_reviewable_proposal(client, monkeypatch):
    monkeypatch.setattr(sourcing_service, "call_model_json", lambda system, prompt, **k: SAMPLE_DRAFT)
    monkeypatch.setattr(sourcing_service, "verify_url",
                        lambda url, **k: ("OK", 0.9) if "youtube" in url else ("BROKEN", 0.0))

    res = client.post("/api/syllabi/generate", json={"name": "Graphs 101", "goal": "learn graphs", "level": "beginner"})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["syllabus"]["slug"]
    proposal = body["proposal"]
    assert proposal["source"] == "AI"
    assert proposal["status"] in ("READY", "DRAFT")
    op_types = {op["type"] for op in proposal["operations"]}
    assert {"module.add", "section.add", "material.add"} <= op_types


def test_generate_proposal_applies_with_resolved_refs(client, monkeypatch):
    monkeypatch.setattr(sourcing_service, "call_model_json", lambda system, prompt, **k: SAMPLE_DRAFT)
    monkeypatch.setattr(sourcing_service, "verify_url", lambda url, **k: ("OK", 0.9) if "youtube" in url else ("BROKEN", 0.0))

    gen = client.post("/api/syllabi/generate", json={"name": "Graphs Apply", "goal": "learn graphs"}).json()
    sid = gen["syllabus"]["id"]
    pid = gen["proposal"]["id"]
    apply = client.post(f"/api/syllabi/{sid}/proposals/{pid}/apply", json={})
    assert apply.status_code == 200, apply.text
    tree = client.get(f"/api/syllabi/{gen['syllabus']['slug']}/tree").json()
    assert tree["module_count"] >= 1
    mats = [mat for m in tree["modules"] for s in m["sections"] for mat in s["materials"]]
    assert any(mat["provider"] == "YouTube" for mat in mats)
