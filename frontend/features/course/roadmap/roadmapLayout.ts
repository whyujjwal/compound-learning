import type { Edge, Node } from "@xyflow/react";
import type { MaterialStatus, RoadmapGraph, RoadmapNode } from "../types";

const SIZE: Record<RoadmapNode["type"], { width: number; height: number }> = {
  module: { width: 240, height: 72 },
  section: { width: 200, height: 56 },
  material: { width: 220, height: 52 },
};

export interface ElkNodeSpec { id: string; width: number; height: number; }
export interface ElkEdgeSpec { id: string; sources: string[]; targets: string[]; }
export interface ElkGraphSpec {
  id: string;
  layoutOptions: Record<string, string>;
  children: ElkNodeSpec[];
  edges: ElkEdgeSpec[];
}

export function toElkGraph(graph: RoadmapGraph): ElkGraphSpec {
  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "60",
      "elk.spacing.nodeNode": "32",
    },
    children: graph.nodes.map((n) => ({ id: n.id, ...SIZE[n.type] })),
    edges: graph.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };
}

export function statusColor(status: MaterialStatus): string {
  if (status === "mastered") return "var(--ok, #22c55e)";
  if (status === "started") return "var(--accent, #6366f1)";
  return "var(--hairline, #888)";
}

export function toFlowElements(
  graph: RoadmapGraph,
  positions: Record<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((n) => ({
    id: n.id,
    type: "roadmap",
    position: positions[n.id] ?? { x: 0, y: 0 },
    data: n as unknown as Record<string, unknown>,
  }));
  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    animated: e.kind !== "primary",
    style: e.kind === "primary"
      ? { stroke: graph.color, strokeWidth: 2 }
      : { stroke: "var(--hairline)", strokeDasharray: "4 3" },
  }));
  return { nodes, edges };
}
