"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SyllabusDetail, SyllabusModule, SyllabusProposal } from "../types";
import { syllabusApi } from "../api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import { ProposalDiff } from "../proposals/ProposalDiff";

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set(syllabus.modules.map((m) => m.id)));
  const [busy, setBusy] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [materialDraft, setMaterialDraft] = useState<Record<string, { title: string; url: string }>>({});

  async function refresh() {
    await qc.invalidateQueries({ queryKey: queryKeys.syllabus(syllabus.slug) });
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
    <div className="studio-editor">
      <section className="studio-panel">
        <h3>Modules & materials</h3>
        <form className="studio-inline-form" onSubmit={addModule}>
          <input
            className="v2-input"
            placeholder="New module title"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
          />
          <button type="submit" className="v2-btn primary sm" disabled={busy}>
            Add module
          </button>
        </form>

        <div className="module-list">
          {syllabus.modules.map((module) => (
            <div key={module.id} className="module-card studio-module">
              <div className="module-card-head studio-module-head">
                <button type="button" className="studio-module-toggle" onClick={() => toggleModule(module.id)}>
                  <strong>{module.title}</strong>
                  <span className="pill muted">{module.materials.length} materials</span>
                </button>
                <button
                  type="button"
                  className="v2-btn ghost sm"
                  disabled={busy}
                  onClick={() => deleteModule(module)}
                >
                  Remove
                </button>
              </div>

              {expanded.has(module.id) && (
                <div className="studio-module-body">
                  <ul className="module-material-list">
                    {module.materials.map((material) => (
                      <li key={material.id}>
                        <span>{material.title}</span>
                        <button
                          type="button"
                          className="v2-btn ghost sm"
                          disabled={busy}
                          onClick={() => deleteMaterial(material.id)}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="studio-inline-form">
                    <input
                      className="v2-input"
                      placeholder="Material title"
                      value={materialDraft[module.id]?.title ?? ""}
                      onChange={(e) =>
                        setMaterialDraft((prev) => ({
                          ...prev,
                          [module.id]: { ...prev[module.id], title: e.target.value, url: prev[module.id]?.url ?? "" },
                        }))
                      }
                    />
                    <input
                      className="v2-input"
                      placeholder="Resource URL (optional)"
                      value={materialDraft[module.id]?.url ?? ""}
                      onChange={(e) =>
                        setMaterialDraft((prev) => ({
                          ...prev,
                          [module.id]: { title: prev[module.id]?.title ?? "", url: e.target.value },
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="v2-btn sm"
                      disabled={busy}
                      onClick={() => addMaterial(module.id)}
                    >
                      Add material
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="studio-panel">
        <h3>AI proposals</h3>
        <form className="studio-ai-form" onSubmit={requestAiProposal}>
          <textarea
            className="v2-input"
            rows={3}
            placeholder="Describe how to improve this syllabus — add projects, replace weak links, deepen a module…"
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
          />
          <button type="submit" className="v2-btn primary" disabled={aiBusy || !aiInstruction.trim()}>
            {aiBusy ? "Generating…" : "Generate proposal"}
          </button>
        </form>

        {activeProposal && (
          <ProposalDiff
            proposal={activeProposal}
            onApply={applyProposal}
            onReject={rejectProposal}
            applying={applying}
          />
        )}
      </section>
    </div>
  );
}
