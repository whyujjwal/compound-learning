"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge, EmptyState } from "@/components/primitives";
import type { SyllabusMaterial } from "../types";

function stateColor(state: string | null): React.CSSProperties["color"] {
  if (state === "mastered") return "var(--ok)";
  if (state === "learning" || state === "review") return "var(--accent)";
  return "var(--muted)";
}

function stateDotTitle(state: string | null): string {
  if (state === "mastered") return "Mastered";
  if (state === "learning") return "Learning";
  if (state === "review") return "Due for review";
  return "Not started";
}

function MaterialRow({ material }: { material: SyllabusMaterial }) {
  const state = material.card_state;
  const isOpen = Boolean(material.external_url);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 0",
        borderBottom: "1px solid var(--hairline)",
        transition: "background var(--dur-fast)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--overlay-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      {/* Status dot with title tooltip via title attr */}
      <span
        aria-label={stateDotTitle(state)}
        title={stateDotTitle(state)}
        style={{
          flexShrink: 0,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: stateColor(state),
          cursor: "default",
        }}
      />

      {/* Title */}
      <span style={{ flex: 1, fontSize: 14, color: "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {isOpen ? (
          <a
            href={material.external_url!}
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

        {/* Open link button — quick access without navigating the title */}
        {isOpen && (
          <a
            href={material.external_url!}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${material.title}`}
            title="Open resource"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 4,
              border: "1px solid var(--hairline)",
              color: "var(--muted)",
              textDecoration: "none",
              flexShrink: 0,
              transition: "color var(--dur-fast), border-color var(--dur-fast)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "var(--accent)";
              el.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "var(--muted)";
              el.style.borderColor = "var(--hairline)";
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
              <path d="M1.5 9.5L9.5 1.5M4.5 1.5H9.5V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
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
      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 2v6h6M16 13H8M16 17H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        }
        title="No materials yet"
        description="Add materials to your modules in Studio — they'll be listed here."
      />
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
