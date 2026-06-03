"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { SyllabusMaterial, SyllabusModule } from "@/lib/api";

type ModuleNodeData = {
  title: string;
  objective: string;
  difficulty: string;
  minutes: number;
  materialCount: number;
  started: number;
  mastered: number;
};

type MaterialNodeData = {
  title: string;
  type: string;
  minutes: number;
  difficulty: string | null;
};

function ModuleNode({ data }: NodeProps<Node<ModuleNodeData>>) {
  const pct = data.materialCount ? Math.round((data.mastered / data.materialCount) * 100) : 0;
  return (
    <div className="track-map-node module">
      <div className="track-map-node-top">
        <span>{data.difficulty}</span>
        <strong>{pct}%</strong>
      </div>
      <h3>{data.title}</h3>
      <p>{data.objective}</p>
      <div className="track-map-node-meta">
        <span>{data.materialCount} materials</span>
        <span>{Math.round(data.minutes / 60) || 1}h</span>
        <span>{data.started} started</span>
      </div>
    </div>
  );
}

function MaterialNode({ data }: NodeProps<Node<MaterialNodeData>>) {
  return (
    <div className="track-map-node material">
      <span>{data.type}</span>
      <strong>{data.title}</strong>
      <small>{data.minutes}m{data.difficulty ? ` · ${data.difficulty}` : ""}</small>
    </div>
  );
}

const nodeTypes = {
  module: ModuleNode,
  material: MaterialNode,
};

type TrackMapProps = {
  modules: SyllabusModule[];
  accent: string;
  title?: string;
};

export function TrackMap({ modules, accent, title = "Track map" }: TrackMapProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(modules[0]?.id ?? null);
  const [showMaterials, setShowMaterials] = useState(false);

  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? modules[0] ?? null;

  const { nodes, edges } = useMemo(() => {
    const nextNodes: Node<ModuleNodeData | MaterialNodeData>[] = [];
    const nextEdges: Edge[] = [];
    modules.forEach((module, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const moduleNodeId = `module-${module.id}`;
      nextNodes.push({
        id: moduleNodeId,
        type: "module",
        position: { x: col * 340, y: row * 300 },
        data: {
          title: module.title,
          objective: module.objective,
          difficulty: module.difficulty ?? "mixed",
          minutes: module.estimated_minutes,
          materialCount: module.material_count,
          started: module.started_count ?? 0,
          mastered: module.mastered_count ?? 0,
        },
      });
      if (index > 0) {
        nextEdges.push({
          id: `module-edge-${index}`,
          source: `module-${modules[index - 1].id}`,
          target: moduleNodeId,
          type: "smoothstep",
          animated: index === 1,
          style: { stroke: accent, strokeWidth: 2 },
        });
      }
      if (showMaterials) {
        module.materials.slice(0, 5).forEach((material: SyllabusMaterial, materialIndex) => {
          const materialNodeId = `material-${material.id}`;
          nextNodes.push({
            id: materialNodeId,
            type: "material",
            position: {
              x: col * 340 + 18 + (materialIndex % 2) * 150,
              y: row * 300 + 178 + Math.floor(materialIndex / 2) * 82,
            },
            data: {
              title: material.title,
              type: material.resource_type ?? "material",
              minutes: material.estimated_minutes,
              difficulty: material.difficulty,
            },
          });
          nextEdges.push({
            id: `material-edge-${module.id}-${material.id}`,
            source: moduleNodeId,
            target: materialNodeId,
            type: "smoothstep",
            style: { stroke: "var(--hairline-strong)", strokeWidth: 1 },
          });
        });
      }
    });
    return { nodes: nextNodes, edges: nextEdges };
  }, [accent, modules, showMaterials]);

  if (modules.length === 0) {
    return null;
  }

  return (
    <section className="track-map-shell" style={{ ["--track-color" as string]: accent }}>
      <div className="track-map-toolbar">
        <div>
          <span>Interactive map</span>
          <strong>{title}</strong>
        </div>
        <div className="track-map-actions">
          <button
            type="button"
            className={`v2-btn sm${showMaterials ? " primary" : " ghost"}`}
            onClick={() => setShowMaterials((value) => !value)}
          >
            Materials
          </button>
        </div>
      </div>
      <div className="track-map-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.35}
          maxZoom={1.4}
          nodesDraggable
          onNodeClick={(_, node) => {
            if (node.id.startsWith("module-")) setSelectedModuleId(node.id.replace("module-", ""));
          }}
        >
          <Background gap={28} size={1} color="var(--hairline)" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeStrokeWidth={2} />
        </ReactFlow>
      </div>
      {selectedModule && (
        <aside className="track-map-inspector">
          <div>
            <span>Selected module</span>
            <h3>{selectedModule.title}</h3>
            <p>{selectedModule.objective}</p>
          </div>
          <div className="track-map-inspector-grid">
            <span>{selectedModule.material_count} materials</span>
            <span>{Math.round(selectedModule.estimated_minutes / 60) || 1}h</span>
            <span>{selectedModule.difficulty}</span>
          </div>
          <div className="track-map-inspector-list">
            {selectedModule.materials.slice(0, 6).map((material) => (
              <a
                key={material.id}
                href={material.external_url ?? "#"}
                target={material.external_url ? "_blank" : undefined}
                rel={material.external_url ? "noreferrer" : undefined}
              >
                <strong>{material.title}</strong>
                <small>{material.resource_type ?? "material"} · {material.estimated_minutes}m</small>
              </a>
            ))}
          </div>
        </aside>
      )}
    </section>
  );
}
