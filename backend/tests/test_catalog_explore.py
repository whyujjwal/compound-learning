"""Explore catalog hides system templates and flags already-adopted tracks."""


def test_catalog_excludes_system_templates(client):
    res = client.get("/api/catalog/tracks")
    assert res.status_code == 200
    slugs = {t["slug"] for t in res.json()}
    assert "dsa" not in slugs
    assert "system-design" not in slugs


def test_catalog_flags_already_in_library(client):
    created = client.post(
        "/api/syllabi",
        json={"slug": "pub-explore", "name": "Pub Explore", "visibility": "PUBLIC"},
    ).json()
    listing = client.get("/api/catalog/tracks").json()
    target = next((t for t in listing if t["slug"] == "pub-explore"), None)
    assert target is not None
    assert target["already_in_library"] is False

    client.post(f"/api/catalog/tracks/{target['id']}/adopt")
    after = client.get("/api/catalog/tracks").json()
    owned = next(t for t in after if t["slug"] == "pub-explore")
    assert owned["already_in_library"] is True
