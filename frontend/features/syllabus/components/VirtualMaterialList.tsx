"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/primitives";
import type { SyllabusMaterial } from "../types";

function stateColor(state: string | null): React.CSSProperties["color"] {
  if (state === "mastered") return "var(--ok)";
  if (state === "learning" || state === "review") return "var(--accent)";
  return "var(--muted)";
}

function MaterialRow({ material }: { material: SyllabusMaterial }) {
  const state = material.card_state;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 0",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      {/* Status dot */}
      <span
        aria-label={state ?? "new"}
        style={{
          flexShrink: 0,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: stateColor(state),
        }}
      />

      {/* Title */}
      <span style={{ flex: 1, fontSize: 14, color: "var(--text)", minWidth: 0 }}>
        {material.external_url ? (
          <a
            href={material.external_url}
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "inherit")}
          >
            {material.title}
          </a>
        ) : (
          material.title
        )}
      </span>

      {/* Meta */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        {material.resource_type && (
          <Badge color="muted">{material.resource_type}</Badge>
        )}
        {material.estimated_minutes > 0 && (
          <span style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            {material.estimated_minutes}m
          </span>
        )}
      </div>
    </div>
  );
}

export function VirtualMaterialList({ materials }: { materials: SyllabusMaterial[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: materials.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  if (materials.length === 0) {
    return (
      <p style={{ padding: "24px 0", fontSize: 14, color: "var(--muted)" }}>
        No materials in this syllabus yet.
      </p>
    );
  }

  // Small lists: plain rendering
  if (materials.length <= 50) {
    return (
      <div>
        {materials.map((m) => (
          <MaterialRow key={m.id} material={m} />
        ))}
      </div>
    );
  }

  // Large lists: virtualized
  return (
    <div
      ref={parentRef}
      style={{ height: 600, overflowY: "auto", contain: "strict" }}
    >
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
