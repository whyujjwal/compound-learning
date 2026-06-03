import type { RoadmapNode } from "../types";

export function NodeInspector({ node }: { node: RoadmapNode | null }) {
  if (!node) return <aside className="course-roadmap-inspector empty">Select a node to inspect.</aside>;
  return (
    <aside className="course-roadmap-inspector">
      <span className="course-roadmap-inspector-type">{node.type}</span>
      <h3>{node.title}</h3>
      {node.label ? <span className="course-label-badge">{node.label}</span> : null}
      <dl>
        <div><dt>Kind</dt><dd>{node.kind}</dd></div>
        {node.resource_type ? <div><dt>Type</dt><dd>{node.resource_type}</dd></div> : null}
        <div><dt>Status</dt><dd>{node.status.replace("_", " ")}</dd></div>
        {node.estimated_minutes ? <div><dt>Time</dt><dd>{node.estimated_minutes}m</dd></div> : null}
      </dl>
      {node.external_url ? (
        <a className="v2-btn primary sm" href={node.external_url} target="_blank" rel="noreferrer">
          Open resource ↗
        </a>
      ) : null}
    </aside>
  );
}
