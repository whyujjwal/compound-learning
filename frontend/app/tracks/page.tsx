"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Track } from "@/lib/api";

export default function TracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Track | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#a78bfa");
  const [multiplier, setMultiplier] = useState(1.0);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setTracks(await api.getTracks());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tracks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function autoSlug(v: string) {
    return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createTrack({ slug, name, description, color, cognitive_multiplier: multiplier });
      setSlug(""); setName(""); setDescription(""); setColor("#a78bfa"); setMultiplier(1.0);
      setShowAdd(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create track");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await api.updateTrack(editing.id, {
        name: editing.name,
        description: editing.description ?? undefined,
        color: editing.color,
        cognitive_multiplier: editing.cognitive_multiplier,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update track");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this track and all its materials?")) return;
    try {
      await api.deleteTrack(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <>
      <header className="roadmap-strip">
        <div className="roadmap-strip-left">
          <h1 className="roadmap-title">Tracks</h1>
          <span className="roadmap-summary">{tracks.length} tracks</span>
        </div>
        <div className="roadmap-strip-right">
          <button className="ghost" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancel" : "+ Add track"}
          </button>
        </div>
      </header>

      {showAdd && (
        <div className="panel">
          <h2>New track</h2>
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              Name
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug || slug === autoSlug(name)) setSlug(autoSlug(e.target.value));
                }}
                required
                placeholder="e.g. Competitive Programming"
              />
            </label>
            <label>
              Slug
              <input value={slug} onChange={(e) => setSlug(e.target.value)} pattern="^[a-z0-9-]+$" required />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </label>
            <div className="form-row">
              <label>Color <input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
              <label>
                Cognitive multiplier
                <input type="number" step="0.1" min="0.1" max="5" value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} />
              </label>
            </div>
            {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create Track"}
            </button>
          </form>
        </div>
      )}

      {editing && (
        <div className="panel">
          <h2>Edit · {editing.name}</h2>
          <form className="form-grid" onSubmit={handleUpdate}>
            <label>
              Name
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </label>
            <label>
              Description
              <textarea
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
              />
            </label>
            <div className="form-row">
              <label>Color <input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} /></label>
              <label>
                Cognitive multiplier
                <input
                  type="number" step="0.1" min="0.1" max="5"
                  value={editing.cognitive_multiplier}
                  onChange={(e) => setEditing({ ...editing, cognitive_multiplier: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="actions">
              <button type="submit" className="primary" disabled={submitting}>Save</button>
              <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty">Loading tracks…</div>
      ) : (
        <div className="track-grid">
          {tracks.map((track) => (
            <div key={track.id} className="track-card" style={{ ["--track-color" as string]: track.color }}>
              <h3>
                {track.name}
                {track.is_system && <span className="badge">system</span>}
              </h3>
              <p>{track.description || "No description"}</p>
              <div className="track-stats">
                <span><strong>{track.material_count}</strong>materials</span>
                <span><strong>{track.due_card_count}</strong>due</span>
                <span><strong>×{track.cognitive_multiplier}</strong>load</span>
              </div>
              <div className="actions">
                <Link href={`/materials?track=${track.id}`} className="btn">Materials →</Link>
                <button className="ghost" onClick={() => setEditing(track)}>Edit</button>
                {!track.is_system && (
                  <button className="danger" onClick={() => handleDelete(track.id)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
