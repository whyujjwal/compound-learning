"use client";

import { useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type ELK from "elkjs/lib/elk.bundled.js";
import type { RoadmapGraph, RoadmapNode } from "../types";
import { statusColor, toElkGraph, toFlowElements } from "./roadmapLayout";
import { NodeInspector } from "./NodeInspector";

let elkPromise: Promise<InstanceType<typeof ELK>> | null = null;

function getElk() {
  if (!elkPromise) {
    elkPromise = import("elkjs/lib/elk.bundled.js").then((mod) => new mod.default());
  }
  return elkPromise;
}

function RoadmapFlowNode({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const node = data as unknown as RoadmapNode;
  const isModule = node.type === "module";
  const isSection = node.type === "section";

  return (
    <div
      data-testid="roadmap-node"
      style={{
        background: "var(--canvas)",
        border: `1px solid ${node.type === "material" ? statusColor(node.status) : "var(--hairline)"}`,
        borderRadius: isModule ? 6 : 4,
        padding: isModule ? "10px 14px" : "7px 10px",
        boxShadow: isModule ? "var(--shadow-float)" : "none",
        minWidth: isModule ? 200 : isSection ? 160 : 180,
        maxWidth: isModule ? 260 : 220,
      }}
    >
      {node.resource_type && (
        <p style={{
          fontSize: 10,
          color: "var(--muted)",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 3,
        }}>
          {node.resource_type}
        </p>
      )}
      <strong style={{
        fontSize: isModule ? 13 : 12,
        color: "var(--text)",
        display: "block",
        lineHeight: 1.3,
      }}>
        {node.title}
      </strong>
    </div>
  );
}

const nodeTypes = { roadmap: RoadmapFlowNode };

export function RoadmapCanvas({ graph }: { graph: RoadmapGraph }) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selected, setSelected] = useState<RoadmapNode | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!graph.nodes.length) return;
    getElk()
      .then((elk) => elk.layout(toElkGraph(graph)))
      .then((res) => {
        if (cancelled) return;
        const next: Record<string, { x: number; y: number }> = {};
        for (const child of res.children ?? []) next[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
        setPositions(next);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [graph]);

  const { nodes, edges } = useMemo(() => toFlowElements(graph, positions), [graph, positions]);

  if (!graph.nodes.length) {
    return (
      <p style={{ padding: "32px 0", fontSize: 14, color: "var(--muted)" }}>
        Nothing to map yet — add modules and materials.
      </p>
    );
  }

  return (
    <div style={{
      border: "1px solid var(--hairline)",
      borderRadius: 6,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      background: "var(--canvas)",
    }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: "1px solid var(--hairline)",
        background: "var(--panel)",
      }}>
        <strong style={{ fontSize: 13, color: "var(--text)" }}>{graph.name} roadmap</strong>
        <div data-testid="roadmap-legend" style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--muted)" }}>
          {[
            { label: "Mastered", color: statusColor("mastered") },
            { label: "In progress", color: statusColor("started") },
            { label: "Not started", color: statusColor("not_started") },
          ].map(({ label, color }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <i style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ height: 520 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.25}
          maxZoom={1.5}
          onNodeClick={(_, node) => {
            const found = graph.nodes.find((n) => n.id === node.id) ?? null;
            setSelected(found);
          }}
        >
          <Background gap={28} size={1} color="var(--hairline)" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={2}
            style={{ background: "var(--panel)", border: "1px solid var(--hairline)" }}
          />
        </ReactFlow>
      </div>

      {/* Inspector */}
      <NodeInspector node={selected} />
    </div>
  );
}
