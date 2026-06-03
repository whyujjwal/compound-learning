"use client";

import { useState } from "react";
import { applyManualOperation } from "../api/mutations";
import type { CourseModule } from "../types";

export function SectionEditor({
  syllabusId,
  module,
  onChange,
}: {
  syllabusId: string;
  module: CourseModule;
  onChange: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [matDraft, setMatDraft] = useState<Record<string, { title: string; url: string }>>({});

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="course-section-editor">
      {module.sections.map((section) => (
        <div key={section.id} className="course-section-editor-row">
          <div className="course-section-editor-head">
            <strong>{section.title}</strong>
            <button
              type="button"
              className="v2-btn ghost sm"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Remove section "${section.title}"?`)) return;
                void run(() => applyManualOperation(syllabusId, {
                  type: "section.remove",
                  target: { section_id: section.id },
                }));
              }}
            >
              Remove section
            </button>
          </div>
          <div className="studio-inline-form">
            <input
              className="v2-input"
              placeholder="Material title"
              value={matDraft[section.id]?.title ?? ""}
              onChange={(e) =>
                setMatDraft((p) => ({
                  ...p,
                  [section.id]: { title: e.target.value, url: p[section.id]?.url ?? "" },
                }))
              }
            />
            <input
              className="v2-input"
              placeholder="Resource URL (optional)"
              value={matDraft[section.id]?.url ?? ""}
              onChange={(e) =>
                setMatDraft((p) => ({
                  ...p,
                  [section.id]: { title: p[section.id]?.title ?? "", url: e.target.value },
                }))
              }
            />
            <button
              type="button"
              className="v2-btn sm"
              disabled={busy}
              onClick={() => {
                const d = matDraft[section.id];
                if (!d?.title.trim()) return;
                void run(() =>
                  applyManualOperation(syllabusId, {
                    type: "material.add",
                    target: { module_id: module.id, section_id: section.id },
                    payload: { title: d.title.trim(), url: d.url.trim() || undefined },
                  }).then(() => setMatDraft((p) => ({ ...p, [section.id]: { title: "", url: "" } }))),
                );
              }}
            >
              Add material
            </button>
          </div>
        </div>
      ))}
      <div className="studio-inline-form">
        <input
          className="v2-input"
          placeholder="New section title"
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
        />
        <button
          type="button"
          className="v2-btn primary sm"
          disabled={busy || !newSection.trim()}
          onClick={() => {
            void run(() =>
              applyManualOperation(syllabusId, {
                type: "section.add",
                target: { module_id: module.id },
                payload: { title: newSection.trim() },
              }).then(() => setNewSection("")),
            );
          }}
        >
          Add section
        </button>
      </div>
    </div>
  );
}
