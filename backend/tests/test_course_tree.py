"""Tests for the course-domain models, tree service, and endpoints."""

from app.models.track_section import TrackSection


def test_track_section_model_has_expected_columns():
    cols = TrackSection.__table__.columns.keys()
    for expected in ("id", "module_id", "title", "objective", "label", "kind", "learning_outcomes", "sequence"):
        assert expected in cols, f"missing column {expected}"
    assert TrackSection.__tablename__ == "track_sections"
