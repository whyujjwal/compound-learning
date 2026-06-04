"use client";

import type { SyllabusTab } from "../types";

const TABS: { id: SyllabusTab; label: string }[] = [
  { id: "overview", label: "Outline" },
  { id: "studio", label: "Studio" },
  { id: "map", label: "Roadmap" },
  { id: "materials", label: "Materials" },
  { id: "practice", label: "Practice" },
  { id: "history", label: "History" },
];

export function SyllabusTabs({
  active,
  onChange,
}: {
  active: SyllabusTab;
  onChange: (tab: SyllabusTab) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Syllabus sections"
      style={{
        display: "flex",
        borderBottom: "1px solid var(--hairline)",
        gap: 0,
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 14px",
            fontSize: 14,
            fontWeight: active === tab.id ? 500 : 400,
            color: active === tab.id ? "var(--text)" : "var(--muted)",
            background: "transparent",
            border: "none",
            borderBottom: active === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1,
            cursor: "pointer",
            transition: "color var(--dur-fast), border-color var(--dur-fast)",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (active !== tab.id) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
            }
          }}
          onMouseLeave={(e) => {
            if (active !== tab.id) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
