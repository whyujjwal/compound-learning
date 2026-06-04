"use client";

/**
 * HealthAlert
 *
 * Shows a dismissible banner when there are broken-link resources in the
 * course tree. Summarises the count and surfaces a prompt to review them.
 * Per-material badges are already in ResourceChip; this is a course-level summary.
 */

import { useState } from "react";
import type { CourseTree } from "@/features/course/types";

interface HealthAlertProps {
  tree: CourseTree;
}

export function HealthAlert({ tree }: HealthAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  const brokenCount = tree.modules.reduce((sum, mod) =>
    sum + mod.sections.reduce((sSum, sec) =>
      sSum + sec.materials.filter((m) => m.resource_health_status === "BROKEN").length,
      0
    ),
    0
  );

  if (brokenCount === 0 || dismissed) return null;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 5,
        border: "1px solid rgba(239,68,68,0.20)",
        background: "rgba(239,68,68,0.05)",
        marginBottom: 16,
      }}
    >
      {/* Icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        style={{ flexShrink: 0, color: "var(--bad)" }}
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>

      {/* Message */}
      <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>
        <span style={{ fontWeight: 600, color: "var(--bad)" }}>{brokenCount} link{brokenCount !== 1 ? "s" : ""}</span>
        {" "}need attention — {brokenCount !== 1 ? "these resources" : "this resource"} may be unavailable.
      </span>

      {/* Dismiss */}
      <button
        type="button"
        aria-label="Dismiss broken links alert"
        onClick={() => setDismissed(true)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--muted)",
          padding: "2px 4px",
          borderRadius: 3,
          lineHeight: 1,
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color var(--dur-fast)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
      >
        ×
      </button>
    </div>
  );
}
