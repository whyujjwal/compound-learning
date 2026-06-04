"use client";

/**
 * MasterySummaryBar
 * Renders a horizontal mastery summary strip with a progress bar, ProgressRing,
 * and inline counters: mastered / total · started · due.
 *
 * Accepts either a CourseTree (for the outline tab) or plain counts.
 * No modification to existing tested components.
 */

import type { CourseTree } from "@/features/course/types";
import { ProgressRing } from "@/features/course/components/ProgressRing";

interface MasterySummaryBarProps {
  tree: CourseTree;
  /** Optional: due-review count from the syllabus list item */
  dueCount?: number;
}

export function MasterySummaryBar({ tree, dueCount = 0 }: MasterySummaryBarProps) {
  const total = tree.material_count;
  const mastered = tree.mastered_count;

  // Derive started from module/section data
  const started = tree.modules.reduce((sum, mod) => {
    return sum + mod.sections.reduce((sSum, sec) => sSum + sec.started_count, 0);
  }, 0);

  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 0 16px",
        borderBottom: "1px solid var(--hairline)",
        marginBottom: 4,
        flexWrap: "wrap",
      }}
    >
      {/* Progress ring (24px variant) */}
      <ProgressRing value={mastered} total={total} />

      {/* Progress bar + pill counters */}
      <div style={{ flex: 1, minWidth: 180 }}>
        {/* Track bar */}
        <div
          aria-hidden
          style={{
            height: 4,
            borderRadius: 2,
            background: "var(--hairline)",
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 2,
              background: pct === 100 ? "var(--ok)" : "var(--accent)",
              transition: "width 400ms ease",
            }}
          />
        </div>

        {/* Stat line */}
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 12,
            color: "var(--muted)",
            flexWrap: "wrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{mastered}</span>
            {" "}
            <span>/ {total} mastered</span>
          </span>
          {started > 0 && (
            <>
              <span aria-hidden style={{ opacity: 0.4 }}>·</span>
              <span>
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>{started}</span>
                {" "}
                <span>in progress</span>
              </span>
            </>
          )}
          {dueCount > 0 && (
            <>
              <span aria-hidden style={{ opacity: 0.4 }}>·</span>
              <span>
                <span style={{ color: "var(--warn)", fontWeight: 600 }}>{dueCount}</span>
                {" "}
                <span>due for review</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
