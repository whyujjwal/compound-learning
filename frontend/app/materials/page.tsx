"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Material, type Track } from "@/lib/api";

function MaterialsContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("track");

  const [tracks, setTracks] = useState<Track[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [trackId, setTrackId] = useState(preselected ?? "");
  const [editing, setEditing] = useState<Material | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [priority, setPriority] = useState(50);
  const [cognitive, setCognitive] = useState(1.0);

  async function load() {
    setLoading(true);
    try {
      const t = await api.getTracks();
      setTracks(t);
      const selected = trackId || preselected || t[0]?.id || "";
      setTrackId(selected);
      setMaterials(await api.getMaterials(selected || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (!trackId) return;
    api.getMaterials(trackId).then(setMaterials).catch(console.error);
  }, [trackId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!trackId) return;
    setSubmitting(true);
    try {
      await api.createMaterial({
        track_id: trackId,
        title,
        raw_content: content || undefined,
        external_url: url || undefined,
        estimated_minutes: minutes,
        priority_percent: priority,
        cognitive_cost_multiplier: cognitive,
      });
      setTitle(""); setContent(""); setUrl(""); setMinutes(15); setPriority(50); setCognitive(1.0);
      setShowAdd(false);
      setMaterials(await api.getMaterials(trackId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await api.updateMaterial(editing.id, {
        title: editing.title,
        raw_content: editing.raw_content ?? "",
        external_url: editing.external_url ?? "",
        estimated_minutes: editing.estimated_minutes,
        priority_percent: editing.priority_percent,
        cognitive_cost_multiplier: editing.cognitive_cost_multiplier,
      });
      setEditing(null);
      setMaterials(await api.getMaterials(trackId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this material and its card?")) return;
    try {
      await api.deleteMaterial(id);
      setMaterials(await api.getMaterials(trackId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const trackMap = Object.fromEntries(tracks.map((t) => [t.id, t]));
  const activeTrack = trackMap[trackId];

  return (
    <>
      <header className="roadmap-strip">
        <div className="roadmap-strip-left">
          <h1 className="roadmap-title">Materials</h1>
          <span className="roadmap-summary">{materials.length} items</span>
        </div>
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
        <label style={{ flex: 1, maxWidth: "340px", margin: 0 }}>
          Filter by track
          <select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
            <option value="">All tracks</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <button className="primary" onClick={() => setShowAdd(!showAdd)} disabled={!tracks.length}>
          {showAdd ? "Cancel" : "+ Add Material"}
        </button>
      </div>

      {showAdd && (
        <div className="panel">
          <h2>New material{activeTrack ? ` · ${activeTrack.name}` : ""}</h2>
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              Track
              <select value={trackId} onChange={(e) => setTrackId(e.target.value)} required>
                <option value="">Select track</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label>Title <input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
            <label>
              Content (shown on reveal)
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Key concepts, patterns, formulas…" />
            </label>
            <label>Reference URL <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></label>
            <div className="form-row">
              <label>Est. minutes <input type="number" min={1} max={480} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
              <label>Priority (0–100) <input type="number" min={0} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} /></label>
            </div>
            <label>
              Cognitive cost multiplier
              <input type="number" step="0.1" min="0.1" max="5" value={cognitive} onChange={(e) => setCognitive(Number(e.target.value))} />
            </label>
            {error && !editing && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
            <button type="submit" className="primary" disabled={submitting || !trackId}>
              {submitting ? "Adding…" : "Add Material"}
            </button>
          </form>
        </div>
      )}

      {editing && (
        <div className="panel">
          <h2>Edit material</h2>
          <form className="form-grid" onSubmit={handleUpdate}>
            <label>Title <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></label>
            <label>Content <textarea value={editing.raw_content ?? ""} onChange={(e) => setEditing({ ...editing, raw_content: e.target.value })} rows={4} /></label>
            <label>URL <input value={editing.external_url ?? ""} onChange={(e) => setEditing({ ...editing, external_url: e.target.value })} /></label>
            <div className="form-row">
              <label>Minutes <input type="number" min={1} value={editing.estimated_minutes} onChange={(e) => setEditing({ ...editing, estimated_minutes: Number(e.target.value) })} /></label>
              <label>Priority <input type="number" min={0} max={100} value={editing.priority_percent} onChange={(e) => setEditing({ ...editing, priority_percent: Number(e.target.value) })} /></label>
            </div>
            <div className="actions">
              <button type="submit" className="primary" disabled={submitting}>Save</button>
              <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty">Loading materials…</div>
      ) : materials.length === 0 ? (
        <div className="empty">No materials in this track yet.</div>
      ) : (
        <div className="card-list">
          {materials.map((m) => {
            const track = trackMap[m.track_id];
            return (
              <div key={m.id} className="list-item">
                <h3>{m.title}</h3>
                <div className="meta-row">
                  {track && (
                    <span className="badge track">
                      <span className="dot" style={{ background: track.color }} />
                      {track.name}
                    </span>
                  )}
                  <span className="badge">{m.estimated_minutes}m</span>
                  <span className="badge">P{m.priority_percent}</span>
                  {m.card_state && <span className="badge">{m.card_state}</span>}
                  {m.card_due_at && (
                    <span className="badge">Due {new Date(m.card_due_at).toLocaleDateString()}</span>
                  )}
                </div>
                {m.raw_content && (
                  <p className="muted" style={{ fontSize: "0.9rem", margin: "0.65rem 0 0", lineHeight: 1.6 }}>
                    {m.raw_content.slice(0, 180)}{m.raw_content.length > 180 ? "…" : ""}
                  </p>
                )}
                <div className="actions">
                  <button className="ghost" onClick={() => setEditing(m)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(m.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div className="empty">Loading…</div>}>
      <MaterialsContent />
    </Suspense>
  );
}
