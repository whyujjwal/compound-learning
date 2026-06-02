"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, type Material, type Track } from "@/lib/api";

export default function CurriculumEditorPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackId, setTrackId] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editing, setEditing] = useState<Material | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getTracks().then((t) => {
      setTracks(t);
      if (t[0]) setTrackId(t[0].id);
    });
  }, []);

  useEffect(() => {
    if (!trackId) return;
    api.getMaterials(trackId).then(setMaterials);
  }, [trackId]);

  async function saveMaterial(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    await api.updateMaterial(editing.id, {
      title: editing.title,
      raw_content: editing.raw_content ?? undefined,
      priority_percent: editing.priority_percent,
      estimated_minutes: editing.estimated_minutes,
    });
    setMessage("Saved.");
    setMaterials(await api.getMaterials(trackId));
  }

  async function reimport() {
    const result = await api.importExampleCurriculum();
    setMessage(`Imported: ${JSON.stringify(result)}`);
    if (trackId) setMaterials(await api.getMaterials(trackId));
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Curriculum Editor</h1>
        <p className="page-sub">Edit materials in-app or import the bundled example curriculum.</p>
      </header>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select value={trackId} onChange={(e) => setTrackId(e.target.value)} className="v2-input">
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="button" className="v2-btn ghost" onClick={reimport}>
          Import example curriculum
        </button>
      </div>

      {message && <p className="pill ok">{message}</p>}

      <div className="editor-split">
        <div className="editor-list">
          {materials.slice(0, 100).map((m) => (
            <button
              key={m.id}
              type="button"
              className={`editor-item${editing?.id === m.id ? " active" : ""}`}
              onClick={() => setEditing(m)}
            >
              <span className="editor-item-title">{m.title}</span>
              <span className="pill muted">P{m.priority_percent}</span>
            </button>
          ))}
        </div>

        {editing && (
          <form className="card editor-form" onSubmit={saveMaterial}>
            <label>
              Title
              <input
                className="v2-input"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </label>
            <label>
              Notes
              <textarea
                className="v2-input"
                rows={6}
                value={editing.raw_content ?? ""}
                onChange={(e) => setEditing({ ...editing, raw_content: e.target.value })}
              />
            </label>
            <label>
              Priority %
              <input
                type="number"
                className="v2-input"
                value={editing.priority_percent}
                onChange={(e) =>
                  setEditing({ ...editing, priority_percent: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Est. minutes
              <input
                type="number"
                className="v2-input"
                value={editing.estimated_minutes}
                onChange={(e) =>
                  setEditing({ ...editing, estimated_minutes: Number(e.target.value) })
                }
              />
            </label>
            <button type="submit" className="v2-btn primary">
              Save material
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
