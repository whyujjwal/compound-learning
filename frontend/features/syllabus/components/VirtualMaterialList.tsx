"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SyllabusMaterial } from "../types";

export function VirtualMaterialList({ materials }: { materials: SyllabusMaterial[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: materials.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });

  if (materials.length <= 50) {
    return (
      <div className="module-list">
        {materials.map((material) => (
          <MaterialRow key={material.id} material={material} />
        ))}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="virtual-material-list">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => {
          const material = materials[item.index];
          return (
            <div
              key={material.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${item.start}px)`,
              }}
            >
              <MaterialRow material={material} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MaterialRow({ material }: { material: SyllabusMaterial }) {
  return (
    <div className="module-card">
      <div className="module-card-head">
        <strong>{material.title}</strong>
        <span className="pill muted">{material.resource_type || "resource"}</span>
      </div>
    </div>
  );
}
