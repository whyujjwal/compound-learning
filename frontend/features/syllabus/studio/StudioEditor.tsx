"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Textarea, Field } from "@/components/primitives";
import type { SyllabusDetail, SyllabusModule, SyllabusProposal } from "../types";
import { syllabusApi } from "../api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import { ProposalDiff } from "../proposals/ProposalDiff";
import { SectionEditor } from "@/features/course/components/SectionEditor";
import { useCourseTree } from "@/features/course/hooks/useCourseTree";

/* ─── Section divider ─────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--muted)",
      marginBottom: 12,
    }}>
      {children}
    </h3>
  );
}

export function StudioEditor({
  syllabus,
  activeProposal,
  onProposalChange,
}: {
  syllabus: SyllabusDetail;
  activeProposal: SyllabusProposal | null;
  onProposalChange: () => void;
}) {
  const qc = useQueryClient();
  const { data: courseTree, refetch: refetchTree } = useCourseTree(syllabus.slug);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(syllabus.modules.map((m) => m.id)));
  const [busy, setBusy] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [materialDraft, setMaterialDraft] = useState<Record<string, { title: string; url: string }>>({});

  async function refresh() {
    await qc.invalidateQueries({ queryKey: queryKeys.syllabus(syllabus.slug) });
    await refetchTree();
    onProposalChange();
  }

  function toggleModule(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addModule(e: FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    setBusy(true);
    try {
      await syllabusApi.addModule(syllabus.id, { title: newModuleTitle.trim() });
      setNewModuleTitle("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteModule(module: SyllabusModule) {
    if (!confirm(`Remove module "${module.title}" and its materials?`)) return;
    setBusy(true);
    try {
      await syllabusApi.deleteModule(syllabus.id, module.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addMaterial(moduleId: string) {
    const draft = materialDraft[moduleId];
    if (!draft?.title.trim()) return;
    setBusy(true);
    try {
      await syllabusApi.addMaterial(syllabus.id, {
        title: draft.title.trim(),
        module_id: moduleId,
        external_url: draft.url.trim() || undefined,
      });
      setMaterialDraft((prev) => ({ ...prev, [moduleId]: { title: "", url: "" } }));
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteMaterial(materialId: string) {
    if (!confirm("Remove this material?")) return;
    setBusy(true);
    try {
      await syllabusApi.deleteMaterial(syllabus.id, materialId);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function requestAiProposal(e: FormEvent) {
    e.preventDefault();
    if (!aiInstruction.trim()) return;
    setAiBusy(true);
    try {
      await syllabusApi.createAiProposal(syllabus.id, aiInstruction.trim());
      setAiInstruction("");
      await onProposalChange();
    } finally {
      setAiBusy(false);
    }
  }

  async function applyProposal(operationIds: string[]) {
    if (!activeProposal) return;
    setApplying(true);
    try {
      await syllabusApi.applyProposal(syllabus.id, activeProposal.id, operationIds);
      await refresh();
    } finally {
      setApplying(false);
    }
  }

  async function rejectProposal() {
    if (!activeProposal) return;
    await syllabusApi.rejectProposal(syllabus.id, activeProposal.id);
    await onProposalChange();
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24,
      alignItems: "start",
    }}>
      {/* ── Left: Modules & materials ─────────────────────── */}
      <div>
        <SectionTitle>Modules &amp; materials</SectionTitle>

        {/* Add module form */}
        <form
          onSubmit={addModule}
          style={{ display: "flex", gap: 6, marginBottom: 16 }}
        >
          <Input
            placeholder="New module title"
            value={newModuleTitle}
            style={{ flex: 1 }}
            onChange={(e) => setNewModuleTitle(e.target.value)}
          />
          <Button type="submit" variant="primary" size="sm" disabled={busy || !newModuleTitle.trim()}>
            Add module
          </Button>
        </form>

        {/* Module list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {syllabus.modules.length === 0 && (
            <p style={{ fontSize: 14, color: "var(--muted)", padding: "12px 0" }}>
              No modules yet. Add one above.
            </p>
          )}
          {syllabus.modules.map((module) => {
            const isOpen = expanded.has(module.id);
            const courseModule = courseTree?.modules.find((cm) => cm.id === module.id);

            return (
              <div
                key={module.id}
                style={{
                  border: "1px solid var(--hairline)",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {/* Module header */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: "var(--panel)",
                }}>
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <svg
                      width="10" height="10" viewBox="0 0 10 10" fill="none"
                      aria-hidden
                      style={{
                        flexShrink: 0,
                        color: "var(--muted)",
                        transition: "transform var(--dur-fast)",
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    >
                      <path d="M3 1.5l3.5 3.5L3 8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      {module.title}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {module.materials.length} materials
                    </span>
                  </button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() => deleteModule(module)}
                  >
                    Remove
                  </Button>
                </div>

                {/* Module body */}
                {isOpen && (
                  <div style={{ padding: "12px" }}>
                    {/* Materials */}
                    {module.materials.length > 0 && (
                      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 1, marginBottom: 10 }}>
                        {module.materials.map((material) => (
                          <li
                            key={material.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "6px 8px",
                              borderRadius: 4,
                              fontSize: 13,
                              color: "var(--text)",
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLLIElement).style.background = "var(--overlay-hover)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLLIElement).style.background = "transparent")}
                          >
                            <span style={{ flex: 1 }}>{material.title}</span>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={busy}
                              onClick={() => deleteMaterial(material.id)}
                            >
                              Delete
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Add material */}
                    <div style={{ display: "flex", gap: 6, marginBottom: courseModule ? 12 : 0 }}>
                      <Input
                        placeholder="Material title"
                        value={materialDraft[module.id]?.title ?? ""}
                        style={{ flex: 1 }}
                        onChange={(e) =>
                          setMaterialDraft((prev) => ({
                            ...prev,
                            [module.id]: { ...prev[module.id], title: e.target.value, url: prev[module.id]?.url ?? "" },
                          }))
                        }
                      />
                      <Input
                        placeholder="URL (optional)"
                        value={materialDraft[module.id]?.url ?? ""}
                        style={{ flex: 1 }}
                        onChange={(e) =>
                          setMaterialDraft((prev) => ({
                            ...prev,
                            [module.id]: { title: prev[module.id]?.title ?? "", url: e.target.value },
                          }))
                        }
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => addMaterial(module.id)}
                      >
                        Add
                      </Button>
                    </div>

                    {/* Section editor (course tree) */}
                    {courseModule && (
                      <SectionEditor
                        syllabusId={syllabus.id}
                        module={courseModule}
                        onChange={refresh}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: AI proposals ───────────────────────────── */}
      <div>
        <SectionTitle>AI proposals</SectionTitle>

        <form onSubmit={requestAiProposal} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Textarea
            rows={3}
            placeholder="Describe how to improve this syllabus — add projects, replace weak links, deepen a module…"
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={aiBusy || !aiInstruction.trim()}
            loading={aiBusy}
          >
            {aiBusy ? "Generating…" : "Generate proposal"}
          </Button>
        </form>

        {activeProposal && (
          <ProposalDiff
            proposal={activeProposal}
            onApply={applyProposal}
            onReject={rejectProposal}
            applying={applying}
          />
        )}

        {!activeProposal && (
          <p style={{ marginTop: 20, fontSize: 13, color: "var(--muted)" }}>
            No pending proposals. Use the form above to generate one.
          </p>
        )}
      </div>
    </div>
  );
}
