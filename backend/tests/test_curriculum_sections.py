"""Curriculum loader assigns sections (3-level import)."""

import uuid

from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_section import TrackSection
from app.models.user import User
from app.services.curriculum_loader import import_curriculum


def _data(slug):
    return {
        "tracks": [{
            "slug": slug, "name": "Sectioned", "color": "#6366f1",
            "materials": [
                {"title": "Vid A", "url": "https://www.youtube.com/watch?v=a", "type": "video",
                 "module": "Basics", "section": "Intro", "estimated_minutes": 10},
                {"title": "Read B", "url": "https://docs.python.org/3/", "type": "docs",
                 "module": "Basics", "section": "Deep dive", "estimated_minutes": 20},
                {"title": "No section C", "url": "https://example.com/c", "type": "article",
                 "module": "Basics", "estimated_minutes": 5},
            ],
        }]
    }


def test_import_creates_sections_and_links_materials(db_session):
    user = db_session.query(User).first()
    slug = f"sect-{uuid.uuid4().hex[:8]}"
    import_curriculum(db_session, user, _data(slug), set_schedule=False)

    track = db_session.query(Track).filter(Track.user_id == user.id, Track.slug == slug).first()
    sections = (
        db_session.query(TrackSection)
        .join(StudyMaterial, StudyMaterial.section_id == TrackSection.id)
        .filter(StudyMaterial.track_id == track.id)
        .all()
    )
    titles = {s.title for s in sections}
    assert {"Intro", "Deep dive", "General"} <= titles
    mats = db_session.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).all()
    assert all(m.section_id is not None for m in mats)


def test_reimport_is_idempotent_for_sections(db_session):
    user = db_session.query(User).first()
    slug = f"sect-{uuid.uuid4().hex[:8]}"
    import_curriculum(db_session, user, _data(slug), set_schedule=False)
    import_curriculum(db_session, user, _data(slug), set_schedule=False)
    track = db_session.query(Track).filter(Track.user_id == user.id, Track.slug == slug).first()
    intro = (
        db_session.query(TrackSection)
        .join(StudyMaterial, StudyMaterial.section_id == TrackSection.id)
        .filter(StudyMaterial.track_id == track.id, TrackSection.title == "Intro")
        .all()
    )
    assert len({s.id for s in intro}) == 1
