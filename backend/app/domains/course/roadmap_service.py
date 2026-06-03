"""Transform a CourseTree into a RoadmapGraph (nodes + edges). Pure, no DB."""

from __future__ import annotations

from app.domains.course.schemas import CourseMaterial, CourseTree, RoadmapEdge, RoadmapGraph, RoadmapNode


def _status(mat: CourseMaterial) -> str:
    if mat.mastered:
        return "mastered"
    if mat.started:
        return "started"
    return "not_started"


def build_roadmap(tree: CourseTree) -> RoadmapGraph:
    nodes: list[RoadmapNode] = []
    edges: list[RoadmapEdge] = []
    prev_module_id: str | None = None

    for module in tree.modules:
        module_node_id = f"module-{module.id}"
        nodes.append(RoadmapNode(
            id=module_node_id, type="module", parent_id=None, title=module.title,
            kind=module.kind, label=module.label, estimated_minutes=module.estimated_minutes,
        ))
        if prev_module_id is not None:
            edges.append(RoadmapEdge(
                id=f"e-{prev_module_id}-{module_node_id}",
                source=prev_module_id, target=module_node_id, kind="primary",
            ))
        prev_module_id = module_node_id

        for section in module.sections:
            section_node_id = f"section-{section.id}"
            nodes.append(RoadmapNode(
                id=section_node_id, type="section", parent_id=module_node_id, title=section.title,
                kind=section.kind, label=section.label, estimated_minutes=section.estimated_minutes,
            ))
            edges.append(RoadmapEdge(
                id=f"e-{module_node_id}-{section_node_id}",
                source=module_node_id, target=section_node_id, kind="primary",
            ))
            for mat in section.materials:
                mat_node_id = f"material-{mat.id}"
                nodes.append(RoadmapNode(
                    id=mat_node_id, type="material", parent_id=section_node_id, title=mat.title,
                    kind=mat.kind, label=mat.label, resource_type=mat.resource_type,
                    status=_status(mat), external_url=mat.external_url,
                    estimated_minutes=mat.estimated_minutes,
                ))
                edges.append(RoadmapEdge(
                    id=f"e-{section_node_id}-{mat_node_id}",
                    source=section_node_id, target=mat_node_id, kind="primary",
                ))

    return RoadmapGraph(
        syllabus_id=tree.id, slug=tree.slug, name=tree.name, color=tree.color,
        nodes=nodes, edges=edges,
    )
