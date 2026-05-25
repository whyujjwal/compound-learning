"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { trackAccent } from "@/lib/trackColors";
import { api, type Track } from "@/lib/api";

export default function TracksPage() {
  const { setRightPanel } = useShell();
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

  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

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

  useEffect(() => {
    load();
  }, []);

  function autoSlug(v: string) {
    return v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createTrack({ slug, name, description, color, cognitive_multiplier: multiplier });
      setSlug("");
      setName("");
      setDescription("");
      setColor("#a78bfa");
      setMultiplier(1.0);
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
      <header className="page-head">
        <div>
          <h1 className="page-title">Library · Tracks</h1>
          <p className="page-sub">{tracks.length} tracks · admin view</p>
        </div>
        <button
          type="button"
          className="v2-btn"
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? "Cancel" : "+ Add track"}
        </button>
      </header>

      {showAdd && (
        <section className="settings-panel">
          <h2>New track</h2>
          <form onSubmit={handleCreate}>
            <div className="field">
              <span className="field-label">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug || slug === autoSlug(name)) setSlug(autoSlug(e.target.value));
                }}
                required
                placeholder="Competitive Programming"
              />
            </div>
            <div className="field">
              <span className="field-label">Slug</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                pattern="^[a-z0-9-]+$"
                required
              />
            </div>
            <div className="field">
              <span className="field-label">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="field-row">
              <div className="field">
                <span className="field-label">Color</span>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
              <div className="field">
                <span className="field-label">Cognitive multiplier</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value))}
                />
              </div>
            </div>
            {error && <p className="field-msg-bad">{error}</p>}
            <button type="submit" className="v2-btn primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </button>
          </form>
        </section>
      )}

      {editing && (
        <section className="settings-panel">
          <h2>Edit · {editing.name}</h2>
          <form onSubmit={handleUpdate}>
            <div className="field">
              <span className="field-label">Name</span>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <span className="field-label">Description</span>
              <textarea
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="field-row">
              <div className="field">
                <span className="field-label">Color</span>
                <input
                  type="color"
                  value={editing.color}
                  onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                />
              </div>
              <div className="field">
                <span className="field-label">Cognitive multiplier</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  value={editing.cognitive_multiplier}
                  onChange={(e) =>
                    setEditing({ ...editing, cognitive_multiplier: Number(e.target.value) })
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
        <p style={{ color: "var(--fg-mute)" }}>Loading tracks…</p>
      ) : (
        <div className="lib-grid">
          {tracks.map((t) => {
            const accent = trackAccent(t.slug, t.color);
            return (
              <article
                key={t.id}
                className="lib-card"
                style={{ ["--track-color" as string]: accent }}
              >
                <h3 className="lib-card-title">
                  <span className="track-dot" aria-hidden />
                  {t.name}
                  {t.is_system && (
                    <span className="pill muted" style={{ fontSize: 9.5 }}>system</span>
                  )}
                </h3>
                {t.description && <p className="lib-card-desc">{t.description}</p>}
                <div className="lib-card-stats">
                  <span><strong>{t.material_count}</strong>materials</span>
                  <span><strong>{t.due_card_count}</strong>queued</span>
                  <span><strong>×{t.cognitive_multiplier}</strong>load</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Link href={`/track/${t.slug}`} className="v2-btn sm">
                    Open
                  </Link>
                  <Link
                    href={`/materials?track=${t.id}`}
                    className="v2-btn sm ghost"
                  >
                    Materials
                  </Link>
                  <button
                    type="button"
                    className="v2-btn sm ghost"
                    onClick={() => setEditing(t)}
                  >
                    Edit
                  </button>
                  {!t.is_system && (
                    <button
                      type="button"
                      className="v2-btn sm ghost"
                      style={{ color: "var(--bad)" }}
                      onClick={() => handleDelete(t.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
