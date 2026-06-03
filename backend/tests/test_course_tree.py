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
