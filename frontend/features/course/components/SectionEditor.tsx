"use client";

import { useState } from "react";
import { Button, Input, Field } from "@/components/primitives";
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
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Existing sections */}
      {module.sections.map((section) => (
        <div
          key={section.id}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--hairline)",
            borderRadius: 6,
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 13, color: "var(--text)" }}>{section.title}</strong>
            <Button
              variant="danger"
              size="sm"
              aria-label="Remove section"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Remove section "${section.title}"?`)) return;
                void run(() => applyManualOperation(syllabusId, {
                  type: "section.remove",
                  target: { section_id: section.id },
                }));
              }}
            >
              Remove
            </Button>
          </div>

          {/* Add material to section */}
          <div style={{ display: "flex", gap: 6 }}>
            <Input
              placeholder="Material title"
              value={matDraft[section.id]?.title ?? ""}
              style={{ flex: 1 }}
              onChange={(e) =>
                setMatDraft((p) => ({
                  ...p,
                  [section.id]: { title: e.target.value, url: p[section.id]?.url ?? "" },
                }))
              }
            />
            <Input
              placeholder="URL (optional)"
              value={matDraft[section.id]?.url ?? ""}
              style={{ flex: 1 }}
              onChange={(e) =>
                setMatDraft((p) => ({
                  ...p,
                  [section.id]: { title: p[section.id]?.title ?? "", url: e.target.value },
                }))
              }
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={busy || !matDraft[section.id]?.title.trim()}
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
            </Button>
          </div>
        </div>
      ))}

      {/* Add new section */}
      <div style={{ display: "flex", gap: 6 }}>
        <Input
          placeholder="New section title"
          value={newSection}
          style={{ flex: 1 }}
          onChange={(e) => setNewSection(e.target.value)}
        />
        <Button
          variant="primary"
          size="sm"
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
        </Button>
      </div>
    </div>
  );
}
