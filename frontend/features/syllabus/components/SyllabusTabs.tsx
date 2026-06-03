"use client";

import type { SyllabusTab } from "../types";

const TABS: { id: SyllabusTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "studio", label: "Studio" },
  { id: "map", label: "Map" },
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
    <nav className="segmented syllabus-tabs" aria-label="Syllabus sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`segmented-item${active === tab.id ? " active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
