"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShell } from "@/components/ui/Shell";
import { trackAccent } from "@/lib/trackColors";
import { api, type Material, type Track } from "@/lib/api";

function MaterialsContent() {
  const { setRightPanel } = useShell();
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

  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setTitle("");
      setContent("");
      setUrl("");
      setMinutes(15);
      setPriority(50);
      setCognitive(1.0);
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
  const activeTrack = trackId ? trackMap[trackId] : undefined;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Library · Materials</h1>
          <p className="page-sub">{materials.length} items</p>
        </div>
        <button
          type="button"
          className="v2-btn"
          onClick={() => setShowAdd((v) => !v)}
          disabled={!tracks.length}
        >
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </header>

      <div className="lib-bar">
        <div className="field">
          <span className="field-label">Filter by track</span>
          <select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
            <option value="">All tracks</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showAdd && (
        <section className="settings-panel">
          <h2>New material{activeTrack ? ` · ${activeTrack.name}` : ""}</h2>
          <form onSubmit={handleCreate}>
            <div className="field">
              <span className="field-label">Track</span>
              <select
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                required
              >
                <option value="">Select track</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <span className="field-label">Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <span className="field-label">Content (shown on reveal)</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Key concepts, patterns, formulas…"
              />
            </div>
            <div className="field">
              <span className="field-label">Reference URL</span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <span className="field-label">Minutes</span>
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <span className="field-label">Priority</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <span className="field-label">Cognitive ×</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  value={cognitive}
                  onChange={(e) => setCognitive(Number(e.target.value))}
                />
              </div>
            </div>
            {error && <p className="field-msg-bad">{error}</p>}
            <button type="submit" className="v2-btn primary" disabled={submitting || !trackId}>
              {submitting ? "Adding…" : "Add material"}
            </button>
          </form>
        </section>
      )}

      {editing && (
        <section className="settings-panel">
          <h2>Edit material</h2>
          <form onSubmit={handleUpdate}>
            <div className="field">
              <span className="field-label">Title</span>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <span className="field-label">Content</span>
              <textarea
                value={editing.raw_content ?? ""}
                onChange={(e) => setEditing({ ...editing, raw_content: e.target.value })}
                rows={4}
              />
            </div>
            <div className="field">
              <span className="field-label">URL</span>
              <input
                type="url"
                value={editing.external_url ?? ""}
                onChange={(e) => setEditing({ ...editing, external_url: e.target.value })}
              />
            </div>
            <div className="field-row">
              <div className="field">
                <span className="field-label">Minutes</span>
                <input
                  type="number"
                  min={1}
                  value={editing.estimated_minutes}
                  onChange={(e) =>
                    setEditing({ ...editing, estimated_minutes: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <span className="field-label">Priority</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.priority_percent}
                  onChange={(e) =>
                    setEditing({ ...editing, priority_percent: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="v2-btn primary" disabled={submitting}>
                Save
              </button>
              <button type="button" className="v2-btn ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <p style={{ color: "var(--fg-mute)" }}>Loading materials…</p>
      ) : materials.length === 0 ? (
        <p style={{ color: "var(--fg-mute)" }}>No materials in this track yet.</p>
      ) : (
        <div>
          {materials.map((m) => {
            const track = trackMap[m.track_id];
            const accent = track ? trackAccent(track.slug, track.color) : "var(--accent)";
            return (
              <article
                key={m.id}
                className="lib-row"
                style={{ ["--track-color" as string]: accent }}
              >
                <div>
                  <div className="lib-row-title">{m.title}</div>
                  <div className="lib-row-meta">
                    {track && (
                      <span className="pill track">
                        <span className="track-dot" aria-hidden /> {track.name}
                      </span>
                    )}
                    <span className="pill muted">{m.estimated_minutes}m</span>
                    <span className="pill muted">P{m.priority_percent}</span>
                    {m.card_state && <span className="pill muted">{m.card_state}</span>}
                  </div>
                  {m.raw_content && (
                    <p className="lib-row-body">
                      {m.raw_content.slice(0, 180)}
                      {m.raw_content.length > 180 ? "…" : ""}
                    </p>
                  )}
                </div>
                <div className="lib-row-actions">
                  <button
                    type="button"
                    className="v2-btn sm ghost"
                    onClick={() => setEditing(m)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="v2-btn sm ghost"
                    style={{ color: "var(--bad)" }}
                    onClick={() => handleDelete(m.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--fg-mute)" }}>Loading…</p>}>
      <MaterialsContent />
    </Suspense>
  );
}
