"""Tests for the course-domain models, tree service, and endpoints."""

from app.models.track_section import TrackSection


def test_track_section_model_has_expected_columns():
    cols = TrackSection.__table__.columns.keys()
    for expected in ("id", "module_id", "title", "objective", "label", "kind", "learning_outcomes", "sequence"):
        assert expected in cols, f"missing column {expected}"
    assert TrackSection.__tablename__ == "track_sections"


from app.models.material import StudyMaterial
from app.models.track_module import TrackModule


def test_module_and_material_have_course_columns():
    module_cols = TrackModule.__table__.columns.keys()
    for expected in ("label", "kind", "learning_outcomes"):
        assert expected in module_cols, f"module missing {expected}"

    material_cols = StudyMaterial.__table__.columns.keys()
    for expected in ("section_id", "provider", "author", "license", "kind", "label"):
        assert expected in material_cols, f"material missing {expected}"


from app.domains.course.schemas import CourseModule, CourseSection, CourseTree


def test_course_schemas_nest_three_levels():
    section = CourseSection(
        id="00000000-0000-0000-0000-000000000001",
        title="Intro", objective=None, label=None, kind="core",
        learning_outcomes=[], sequence=0, estimated_minutes=10,
        material_count=0, started_count=0, mastered_count=0, materials=[],
    )
    module = CourseModule(
        id="00000000-0000-0000-0000-000000000002",
        title="Basics", objective="", label=None, kind="core",
        learning_outcomes=[], sequence=0, estimated_minutes=10,
        difficulty="beginner", material_count=0, started_count=0, mastered_count=0,
        sections=[section],
    )
    assert module.sections[0].title == "Intro"
    assert {"id", "slug", "name", "modules"} <= set(CourseTree.model_fields.keys())


import uuid

from app.domains.course.tree_service import build_course_tree
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.track_section import TrackSection
from app.models.user import User


def _seed_minimal_track(db):
    user = db.query(User).first()
    track = Track(user_id=user.id, slug=f"tree-{uuid.uuid4().hex[:8]}", name="Tree Test", color="#6366f1")
    db.add(track)
    db.flush()
    module = TrackModule(track_id=track.id, title="Module A", objective="learn A", sequence=0)
    db.add(module)
    db.flush()
    section = TrackSection(module_id=module.id, title="Section A1", kind="core", sequence=0)
    db.add(section)
    db.flush()
    mat = StudyMaterial(
        track_id=track.id, module_id=module.id, section_id=section.id,
        title="Mat 1", resource_type="video", estimated_minutes=20, sequence=0, priority_percent=50,
    )
    db.add(mat)
    db.flush()
    return user, track, module, section, mat


def test_build_course_tree_nests_and_counts(db_session):
    user, track, module, section, mat = _seed_minimal_track(db_session)
    tree = build_course_tree(db_session, track, user.id)
    assert tree.slug == track.slug
    assert tree.module_count == 1
    assert tree.material_count == 1
    assert len(tree.modules) == 1
    m = tree.modules[0]
    assert len(m.sections) == 1
    assert m.sections[0].materials[0].title == "Mat 1"
    assert m.sections[0].materials[0].resource_type == "video"
    assert m.material_count == 1
    assert m.sections[0].mastered_count == 0


def test_get_course_tree_endpoint(client):
    res = client.get("/api/syllabi/dsa/tree")
    assert res.status_code == 200
    body = res.json()
    assert body["slug"] == "dsa"
    assert isinstance(body["modules"], list)
    assert "module_count" in body and "material_count" in body
    if body["modules"]:
        assert "sections" in body["modules"][0]


def test_get_course_tree_unknown_slug_404(client):
    res = client.get("/api/syllabi/does-not-exist/tree")
    assert res.status_code == 404


import time
import uuid as _uuid

from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.track_section import TrackSection


def test_build_course_tree_handles_dense_syllabus(db_session):
    user = db_session.query(User).first()
    track = Track(user_id=user.id, slug=f"big-{_uuid.uuid4().hex[:8]}", name="Big", color="#6366f1")
    db_session.add(track)
    db_session.flush()
    for mi in range(8):
        module = TrackModule(track_id=track.id, title=f"M{mi}", sequence=mi)
        db_session.add(module)
        db_session.flush()
        for si in range(4):
            section = TrackSection(module_id=module.id, title=f"M{mi}S{si}", sequence=si)
            db_session.add(section)
            db_session.flush()
            for ti in range(5):
                db_session.add(
                    StudyMaterial(
                        track_id=track.id,
                        module_id=module.id,
                        section_id=section.id,
                        title=f"M{mi}S{si}T{ti}",
                        estimated_minutes=10,
                        sequence=ti,
                        priority_percent=50,
                    )
                )
    db_session.flush()

    start = time.perf_counter()
    tree = build_course_tree(db_session, track, user.id)
    elapsed = time.perf_counter() - start

    assert tree.material_count == 8 * 4 * 5
    assert sum(len(m.sections) for m in tree.modules) == 8 * 4
    assert elapsed < 2.0
