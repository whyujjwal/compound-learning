"use client";

import { useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Node, type NodeProps } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import type { RoadmapGraph, RoadmapNode } from "../types";
import { statusColor, toElkGraph, toFlowElements } from "./roadmapLayout";
import { NodeInspector } from "./NodeInspector";

const elk = new ELK();

function RoadmapFlowNode({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const node = data as unknown as RoadmapNode;
  return (
    <div
      className={`course-roadmap-node type-${node.type} kind-${node.kind}`}
      style={{ borderColor: node.type === "material" ? statusColor(node.status) : undefined }}
    >
      {node.resource_type ? <span className="course-roadmap-node-type">{node.resource_type}</span> : null}
      <strong>{node.title}</strong>
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
    elk.layout(toElkGraph(graph)).then((res) => {
      if (cancelled) return;
      const next: Record<string, { x: number; y: number }> = {};
      for (const child of res.children ?? []) next[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
      setPositions(next);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [graph]);

  const { nodes, edges } = useMemo(() => toFlowElements(graph, positions), [graph, positions]);

  if (!graph.nodes.length) {
    return <p className="course-roadmap-empty">Nothing to map yet — add modules and materials.</p>;
  }

  return (
    <section className="course-roadmap-shell" style={{ ["--track-color" as string]: graph.color }}>
      <div className="course-roadmap-toolbar">
        <strong>{graph.name} roadmap</strong>
        <div className="course-roadmap-legend">
          <span><i style={{ background: statusColor("mastered") }} /> Mastered</span>
          <span><i style={{ background: statusColor("started") }} /> In progress</span>
          <span><i style={{ background: statusColor("not_started") }} /> Not started</span>
        </div>
      </div>
      <div className="course-roadmap-canvas">
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
          <MiniMap pannable zoomable nodeStrokeWidth={2} />
        </ReactFlow>
      </div>
      <NodeInspector node={selected} />
    </section>
  );
}
