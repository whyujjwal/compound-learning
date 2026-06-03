"""Tests for the roadmap graph model, service, and endpoint."""

from app.models.syllabus_edge import SyllabusEdge


def test_syllabus_edge_model_has_expected_columns():
    cols = SyllabusEdge.__table__.columns.keys()
    for expected in ("id", "syllabus_id", "from_node_type", "from_node_id", "to_node_type", "to_node_id", "kind"):
        assert expected in cols, f"missing column {expected}"
    assert SyllabusEdge.__tablename__ == "syllabus_edges"
