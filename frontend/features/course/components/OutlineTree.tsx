"use client";

import { useState } from "react";
import type { CourseModule, CourseSection, CourseTree } from "../types";
import { KindBadge } from "./KindBadge";
import { OutcomeList } from "./OutcomeList";
import { ProgressRing } from "./ProgressRing";
import { ResourceChip } from "./ResourceChip";

/* ─── Toggle caret ──────────────────────────────────────────── */
function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{
        flexShrink: 0,
        color: "var(--muted)",
        transition: "transform var(--dur-fast)",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
      }}
    >
      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Section block ─────────────────────────────────────────── */
function SectionBlock({ section }: { section: CourseSection }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ marginLeft: 24, marginTop: 4 }}>
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 6px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          borderRadius: 4,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
      >
        <Caret open={open} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
          {section.title}
        </span>
        <KindBadge kind={section.kind} label={section.label} />
        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>
          {section.material_count} items
        </span>
      </button>

      {open && (
        <div style={{ marginLeft: 18, marginTop: 2 }}>
          <OutcomeList outcomes={section.learning_outcomes} />
          <ul style={{ listStyle: "none" }}>
            {section.materials.map((mat) => (
              <li key={mat.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                <ResourceChip material={mat} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Module block ──────────────────────────────────────────── */
function ModuleBlock({ module, index }: { module: CourseModule; index: number }) {
  const [open, setOpen] = useState(index === 0); // first module open by default
  const hours = module.estimated_minutes ? Math.round(module.estimated_minutes / 60) || 1 : null;

  return (
    <section
      style={{
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      {/* Module toggle row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 6px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          borderRadius: 4,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
      >
        <Caret open={open} />

        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
          {module.title}
        </span>

        <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <KindBadge kind={module.kind} label={module.label} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {module.material_count} materials
            {hours ? ` · ${hours}h` : ""}
          </span>
          <ProgressRing value={module.mastered_count} total={module.material_count} />
        </span>
      </button>

      {open && (
        <div style={{ paddingBottom: 12 }}>
          {module.learning_outcomes.length > 0 && (
            <div style={{ marginLeft: 20, marginBottom: 10 }}>
              <OutcomeList outcomes={module.learning_outcomes} heading="By the end of this module" />
            </div>
          )}

          {module.sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── OutlineTree root ──────────────────────────────────────── */
export function OutlineTree({ tree }: { tree: CourseTree }) {
  if (!tree.modules.length) {
    return (
      <p style={{ padding: "32px 0", fontSize: 14, color: "var(--muted)" }}>
        No modules yet. Generate or add some in Studio.
      </p>
    );
  }

  return (
    <div>
      {/* Course-level outcomes */}
      {tree.outcomes.length > 0 && (
        <div style={{
          padding: "16px 0 20px",
          borderBottom: "1px solid var(--hairline)",
          marginBottom: 8,
        }}>
          <OutcomeList outcomes={tree.outcomes} heading="Course outcomes" />
        </div>
      )}

      {/* Module list */}
      {tree.modules.map((module, i) => (
        <ModuleBlock key={module.id} module={module} index={i} />
      ))}
    </div>
  );
}
