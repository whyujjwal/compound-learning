"""Section-aware track cloning."""

import uuid

from app.domains.course.clone_service import clone_track
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.track_section import TrackSection
from app.models.user import User


def _system_source(db):
    owner = db.query(User).first()
    src = Track(user_id=owner.id, slug=f"tmpl-{uuid.uuid4().hex[:8]}", name="Template",
                color="#6366f1", is_system=True, is_public=True, learning_outcomes=["Outcome A"])
    db.add(src)
    db.flush()
    module = TrackModule(track_id=src.id, title="M1", kind="core", label="Foundations", sequence=0)
    db.add(module)
    db.flush()
    section = TrackSection(module_id=module.id, title="S1", kind="core", sequence=0)
    db.add(section)
    db.flush()
    db.add(StudyMaterial(track_id=src.id, module_id=module.id, section_id=section.id,
                         title="Mat 1", resource_type="video", provider="YouTube", kind="core",
                         estimated_minutes=10, sequence=0, priority_percent=50))
    db.flush()
    return src


def test_clone_copies_sections_materials_and_cards(db_session):
    src = _system_source(db_session)
    learner = User(email=f"u-{uuid.uuid4().hex[:8]}@x.test", display_name="U")
    db_session.add(learner)
    db_session.flush()

    clone = clone_track(db_session, src, learner)
    db_session.flush()

    assert clone.user_id == learner.id
    assert clone.source_track_id == src.id
    assert clone.is_system is False
    modules = db_session.query(TrackModule).filter(TrackModule.track_id == clone.id).all()
    assert len(modules) == 1 and modules[0].label == "Foundations"
    sections = (
        db_session.query(TrackSection)
        .join(TrackModule, TrackSection.module_id == TrackModule.id)
        .filter(TrackModule.track_id == clone.id).all()
    )
    assert len(sections) == 1
    mats = db_session.query(StudyMaterial).filter(StudyMaterial.track_id == clone.id).all()
    assert len(mats) == 1
    assert mats[0].section_id == sections[0].id
    assert mats[0].module_id == modules[0].id
    assert mats[0].provider == "YouTube"
    cards = db_session.query(Card).filter(Card.material_id == mats[0].id, Card.user_id == learner.id).all()
    assert len(cards) == 1


def test_clone_is_idempotent_per_source(db_session):
    src = _system_source(db_session)
    learner = User(email=f"u-{uuid.uuid4().hex[:8]}@x.test", display_name="U")
    db_session.add(learner)
    db_session.flush()

    first = clone_track(db_session, src, learner)
    db_session.flush()
    second = clone_track(db_session, src, learner)
    db_session.flush()

    assert first.id == second.id
    owned = db_session.query(Track).filter(Track.user_id == learner.id, Track.source_track_id == src.id).all()
    assert len(owned) == 1


from app.domains.course.clone_service import seed_user_default_tracks


def test_seed_user_default_tracks_clones_each_template(db_session):
    template = (
        db_session.query(Track)
        .filter(Track.is_system.is_(True))
        .first()
    )
    assert template is not None, "expected seeded system templates"

    learner = User(email=f"new-{uuid.uuid4().hex[:8]}@x.test", display_name="New")
    db_session.add(learner)
    db_session.flush()

    count = seed_user_default_tracks(db_session, learner)
    db_session.flush()
    cloned = db_session.query(Track).filter(Track.user_id == learner.id).all()
    assert count == len(cloned)
    assert count >= 1
    again = seed_user_default_tracks(db_session, learner)
    assert again == 0
