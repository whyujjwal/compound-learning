"use client";

/**
 * ModuleProgressList
 *
 * A standalone component showing per-module progress (mastered/total + ring + status label).
 * Separate from the tested OutlineTree component — this is a summary view for the outline
 * preamble and does NOT replace the drill-down behavior of OutlineTree.
 *
 * Status logic:
 *   pct === 100  → "Complete"  (green)
 *   pct > 0      → "In progress" (blue)
 *   else         → "Not started" (muted)
 *
 * If the module has low health (broken materials), it appends a "needs review" label.
 */

import type { CourseModule } from "@/features/course/types";

interface ModuleProgressListProps {
  modules: CourseModule[];
}

type ModuleStatus = "complete" | "in_progress" | "not_started";

function getStatus(mastered: number, total: number): ModuleStatus {
  if (total === 0 || mastered === 0) return "not_started";
  if (mastered >= total) return "complete";
  return "in_progress";
}

const STATUS_LABEL: Record<ModuleStatus, string> = {
  complete: "Complete",
  in_progress: "In progress",
  not_started: "Not started",
};

const STATUS_COLOR: Record<ModuleStatus, string> = {
  complete: "var(--ok)",
  in_progress: "var(--accent)",
  not_started: "var(--muted)",
};

function ModuleProgressRing({ mastered, total }: { mastered: number; total: number }) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const radius = 8;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r={radius} stroke="var(--hairline)" strokeWidth="2" fill="none" />
      {pct > 0 && (
        <circle
          cx="10"
          cy="10"
          r={radius}
          stroke={pct === 100 ? "var(--ok)" : "var(--accent)"}
          strokeWidth="2"
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 10 10)"
        />
      )}
    </svg>
  );
}

function ModuleProgressRow({ module, index }: { module: CourseModule; index: number }) {
  const status = getStatus(module.mastered_count, module.material_count);
  const pct = module.material_count > 0
    ? Math.round((module.mastered_count / module.material_count) * 100)
    : 0;

  // Detect broken materials within sections
  const brokenCount = module.sections.reduce((sum, sec) => {
    return sum + sec.materials.filter((m) => m.resource_health_status === "BROKEN").length;
  }, 0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 6px",
        borderRadius: 4,
        transition: "background var(--dur-fast)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--overlay-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      {/* Sequence number */}
      <span
        style={{
          width: 20,
          fontSize: 12,
          color: "var(--muted)",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        {index + 1}
      </span>

      {/* Progress ring */}
      <span style={{ flexShrink: 0 }}>
        <ModuleProgressRing mastered={module.mastered_count} total={module.material_count} />
      </span>

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text)",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {module.title}
      </span>

      {/* Material count */}
      <span
        style={{
          fontSize: 12,
          color: "var(--muted)",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {module.mastered_count}/{module.material_count}
      </span>

      {/* Status pill */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: STATUS_COLOR[status],
          background: status === "complete"
            ? "rgba(15,123,108,0.08)"
            : status === "in_progress"
            ? "rgba(35,131,226,0.08)"
            : "var(--overlay-hover)",
          padding: "2px 8px",
          borderRadius: 4,
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {STATUS_LABEL[status]}
        {brokenCount > 0 && (
          <span
            style={{ marginLeft: 4, color: "var(--bad)", fontWeight: 600 }}
            title={`${brokenCount} broken link${brokenCount !== 1 ? "s" : ""}`}
          >
            · {brokenCount} broken
          </span>
        )}
      </span>

      {/* Pct */}
      <span
        style={{
          fontSize: 12,
          color: status === "complete" ? "var(--ok)" : "var(--muted)",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
          minWidth: 32,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

export function ModuleProgressList({ modules }: ModuleProgressListProps) {
  if (modules.length === 0) return null;

  return (
    <div
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        padding: "4px 0",
        marginBottom: 20,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 6px 6px 36px",
          borderBottom: "1px solid var(--hairline)",
          marginBottom: 2,
        }}
      >
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Module
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase", minWidth: 56, textAlign: "right" }}>
          Items
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase", minWidth: 88, textAlign: "right" }}>
          Status
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase", minWidth: 32, textAlign: "right" }}>
          %
        </span>
      </div>

      {modules.map((mod, i) => (
        <ModuleProgressRow key={mod.id} module={mod} index={i} />
      ))}
    </div>
  );
}
