"""Background link-health re-check."""

import uuid

from app.domains.course import link_health
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.user import User


def test_recheck_links_updates_status(db_session, monkeypatch):
    user = db_session.query(User).first()
    track = Track(user_id=user.id, slug=f"lh-{uuid.uuid4().hex[:8]}", name="LH", color="#6366f1")
    db_session.add(track)
    db_session.flush()
    ok = StudyMaterial(track_id=track.id, title="Good", external_url="https://good.example/x",
                       resource_health_status="UNKNOWN")
    bad = StudyMaterial(track_id=track.id, title="Bad", external_url="https://bad.example/y",
                        resource_health_status="UNKNOWN")
    none = StudyMaterial(track_id=track.id, title="NoUrl", external_url=None)
    db_session.add_all([ok, bad, none])
    db_session.flush()

    monkeypatch.setattr(link_health, "verify_url",
                        lambda url, **k: ("OK", 0.9) if "good" in url else ("BROKEN", 0.0))

    stats = link_health.recheck_links(db_session)
    db_session.refresh(ok)
    db_session.refresh(bad)
    assert ok.resource_health_status == "OK"
    assert bad.resource_health_status == "BROKEN"
    assert stats["checked"] >= 2
    assert stats["broken"] >= 1
