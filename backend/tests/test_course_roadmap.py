"""Tests for the roadmap graph model, service, and endpoint."""

from app.models.syllabus_edge import SyllabusEdge


def test_syllabus_edge_model_has_expected_columns():
    cols = SyllabusEdge.__table__.columns.keys()
    for expected in ("id", "syllabus_id", "from_node_type", "from_node_id", "to_node_type", "to_node_id", "kind"):
        assert expected in cols, f"missing column {expected}"
    assert SyllabusEdge.__tablename__ == "syllabus_edges"


from app.domains.course.roadmap_service import build_roadmap
from app.domains.course.schemas import CourseMaterial, CourseModule, CourseSection, CourseTree


def _tree_with_two_modules() -> CourseTree:
    mat = CourseMaterial(
        id="00000000-0000-0000-0000-0000000000aa", title="Vid", resource_type="video",
        estimated_minutes=10, priority_percent=50, sequence=0, started=True, mastered=False,
    )
    sec = CourseSection(
        id="00000000-0000-0000-0000-0000000000a1", title="S1", kind="core", sequence=0,
        estimated_minutes=10, material_count=1, started_count=1, mastered_count=0, materials=[mat],
    )
    m1 = CourseModule(
        id="00000000-0000-0000-0000-000000000001", title="M1", kind="core", sequence=0,
        estimated_minutes=10, material_count=1, started_count=1, mastered_count=0, sections=[sec],
    )
    m2 = CourseModule(
        id="00000000-0000-0000-0000-000000000002", title="M2", kind="optional", sequence=1,
        estimated_minutes=0, material_count=0, started_count=0, mastered_count=0, sections=[],
    )
    return CourseTree(
        id="00000000-0000-0000-0000-0000000000ff", slug="rm", name="RM", color="#6366f1",
        version=1, module_count=2, material_count=1, mastered_count=0, modules=[m1, m2],
    )


def test_build_roadmap_emits_spine_and_status():
    graph = build_roadmap(_tree_with_two_modules())
    module_nodes = [n for n in graph.nodes if n.type == "module"]
    assert len(module_nodes) == 2
    spine = [e for e in graph.edges if e.kind == "primary"
             and e.source == "module-00000000-0000-0000-0000-000000000001"
             and e.target == "module-00000000-0000-0000-0000-000000000002"]
    assert len(spine) == 1
    mat_node = next(n for n in graph.nodes if n.type == "material")
    assert mat_node.status == "started"
    assert next(n for n in graph.nodes if n.id.endswith("000000000002")).kind == "optional"


def test_get_roadmap_endpoint(client):
    res = client.get("/api/syllabi/dsa/roadmap")
    assert res.status_code == 200
    body = res.json()
    assert body["slug"] == "dsa"
    assert isinstance(body["nodes"], list)
    assert isinstance(body["edges"], list)
    assert any(n["type"] == "module" for n in body["nodes"])
