import { Badge, Button } from "@/components/primitives";
import type { RoadmapNode } from "../types";

export function NodeInspector({ node }: { node: RoadmapNode | null }) {
  if (!node) {
    return (
      <aside
        aria-label="Node inspector"
        style={{
          padding: "20px 16px",
          borderTop: "1px solid var(--hairline)",
          color: "var(--muted)",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        Select a node to inspect
      </aside>
    );
  }

  return (
    <aside
      aria-label="Node inspector"
      style={{
        padding: "16px",
        borderTop: "1px solid var(--hairline)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Kind / type */}
      <div style={{ display: "flex", gap: 6 }}>
        <Badge color="muted">{node.type}</Badge>
        {node.label && <Badge color="accent">{node.label}</Badge>}
        {node.kind !== "core" && <Badge color="default">{node.kind}</Badge>}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
        {node.title}
      </h3>

      {/* Details table */}
      <dl style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {node.resource_type && (
          <div style={{ display: "flex", gap: 8 }}>
            <dt style={{ fontSize: 12, color: "var(--muted)", minWidth: 60 }}>Type</dt>
            <dd style={{ fontSize: 13, color: "var(--text)" }}>{node.resource_type}</dd>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <dt style={{ fontSize: 12, color: "var(--muted)", minWidth: 60 }}>Status</dt>
          <dd style={{ fontSize: 13, color: "var(--text)" }}>{node.status.replace("_", " ")}</dd>
        </div>
        {node.estimated_minutes ? (
          <div style={{ display: "flex", gap: 8 }}>
            <dt style={{ fontSize: 12, color: "var(--muted)", minWidth: 60 }}>Time</dt>
            <dd style={{ fontSize: 13, color: "var(--text)" }}>{node.estimated_minutes}m</dd>
          </div>
        ) : null}
      </dl>

      {node.external_url && (
        <a href={node.external_url} target="_blank" rel="noreferrer">
          <Button variant="primary" size="sm" style={{ width: "100%" }}>
            Open resource
          </Button>
        </a>
      )}
    </aside>
  );
}
