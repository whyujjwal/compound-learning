"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { trackAccent } from "@/lib/trackColors";
import { api, type GeneratedRoadmap } from "@/lib/api";

export default function RoadmapPage() {
  const { overview, reloadAll, setRightPanel } = useShell();
  const [examples, setExamples] = useState<GeneratedRoadmap["curriculum"] | null>(null);
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [trackName, setTrackName] = useState("");
  const [trackDescription, setTrackDescription] = useState("");

  useEffect(() => {
    setRightPanel(
      overview ? (
        <RightPanel>
          <PanelSection label="Global progress">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="stat">
                <span className="stat-num">{overview.total_started}</span>
                <span className="stat-label">materials started</span>
                <span className="stat-hint">of {overview.total_materials}</span>
              </div>
              <div className="stat">
                <span className="stat-num">{overview.total_mastered}</span>
                <span className="stat-label">mastered</span>
              </div>
              <div className="stat">
                <span className="stat-num">{overview.due_reviews}</span>
                <span className="stat-label">reviews queued</span>
              </div>
            </div>
          </PanelSection>
          <PanelSection label="Today's blocks">
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
              {overview.today_blocks.map((b, i) => (
                <div
                  key={`${b.block}-${b.track}`}
                  style={{ display: "flex", gap: 8, color: "var(--fg-soft)" }}
                >
                  <span className="pill muted" style={{ fontSize: 9.5 }}>{i + 1}</span>
                  <span>{b.track_name || b.track}</span>
                </div>
              ))}
            </div>
          </PanelSection>
        </RightPanel>
      ) : null
    );
    return () => setRightPanel(null);
  }, [overview, setRightPanel]);

  useEffect(() => {
    api.getExampleCurriculum().then(setExamples).catch(() => {});
  }, []);

  function autoSlug(v: string) {
    return v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function importExamples() {
    setImporting(true);
    setMessage(null);
    try {
      const result = await api.importExampleCurriculum();
      await reloadAll();
      setMessage(
        `Imported ${result.tracks_created} example tracks and ${result.materials_created} materials.`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not import examples.");
    } finally {
      setImporting(false);
    }
  }

  async function createFirstTrack(e: FormEvent) {
    e.preventDefault();
    if (!trackName.trim()) return;
    setCreating(true);
    setMessage(null);
    try {
      await api.createTrack({
        slug: autoSlug(trackName),
        name: trackName.trim(),
        description: trackDescription.trim() || undefined,
        color: "#14b8a6",
      });
      setTrackName("");
      setTrackDescription("");
      await reloadAll();
      setMessage("Track created. Add it to your weekly calendar when you are ready.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create track.");
    } finally {
      setCreating(false);
    }
  }

  if (!overview) {
    return (
      <>
        <h1 className="roadmap-title">Roadmap</h1>
        <p style={{ color: "var(--fg-mute)" }}>Loading…</p>
      </>
    );
  }

  return (
    <>
      <header className="roadmap-head">
        <div>
          <p className="page-kicker">Personal learning library</p>
          <h1 className="roadmap-title">My Library</h1>
          <p style={{ color: "var(--fg-mute)", fontSize: 13, marginTop: 4 }}>
            Your adopted and generated tracks — {overview.total_materials} materials across{" "}
            {overview.tracks.length} tracks. Progress, notes, schedule, and reviews stay private here.
          </p>
        </div>
        <div className="roadmap-meta">
          <div className="stat">
            <span className="stat-num">{overview.total_mastered}</span>
            <span className="stat-label">mastered</span>
          </div>
          <div className="stat">
            <span className="stat-num">{overview.due_reviews}</span>
            <span className="stat-label">queued</span>
          </div>
          <Link href="/curriculum/build" className="v2-btn primary">
            AI Studio
          </Link>
          <Link href="/explore" className="v2-btn ghost">
            Explore
          </Link>
          <Link href="/schedule" className="v2-btn ghost">
            My Week
          </Link>
        </div>
      </header>

      {message && <p className="week-canvas-message">{message}</p>}

      {overview.tracks.length === 0 && (
        <section className="canvas-empty">
          <div className="canvas-empty-main">
            <h2>Start with a blank canvas.</h2>
            <p>
              Your library stays empty until you adopt or generate a track. Start from the public
              catalog, ask AI Studio for a custom roadmap, or create a manual track for something
              highly specific.
            </p>
            <div className="canvas-empty-actions">
              <Link href="/explore" className="v2-btn primary">
                Explore tracks
              </Link>
              <Link href="/curriculum/build" className="v2-btn ghost">
                Generate with AI
              </Link>
              <Link href="/schedule" className="v2-btn ghost">
                Open weekly calendar
              </Link>
              <button
                type="button"
                className="v2-btn ghost"
                onClick={importExamples}
                disabled={importing}
              >
                {importing ? "Importing..." : "Import examples"}
              </button>
            </div>
          </div>

          <form className="canvas-create" onSubmit={createFirstTrack}>
            <h3>Create a private track</h3>
            <label>
              <span>Name</span>
              <input
                className="v2-input"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder="Backend Engineering"
                required
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                className="v2-input"
                rows={3}
                value={trackDescription}
                onChange={(e) => setTrackDescription(e.target.value)}
                placeholder="What this roadmap is for."
              />
            </label>
            <button type="submit" className="v2-btn primary" disabled={creating}>
              {creating ? "Creating..." : "Create track"}
            </button>
          </form>

          {examples && (
            <div className="canvas-examples">
              <div className="canvas-examples-head">
                <h3>Example roadmaps</h3>
                <span>{examples.tracks.length} tracks</span>
              </div>
              <div className="canvas-example-grid">
                {examples.tracks.map((track) => (
                  <article
                    key={track.slug}
                    className="canvas-example-card"
                    style={{ ["--track-color" as string]: trackAccent(track.slug, track.color) }}
                  >
                    <span className="track-dot" aria-hidden />
                    <h4>{track.name}</h4>
                    {track.description && <p>{track.description}</p>}
                    <span>{track.materials.length} materials</span>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="roadmap-grid">
        {overview.tracks.map((t) => {
          const accent = trackAccent(t.slug, t.color);
          const pct = t.material_count
            ? Math.round((t.mastered_count / t.material_count) * 100)
            : 0;
          return (
            <Link
              key={t.id}
              href={`/track/${t.slug}`}
              className="roadmap-card"
              style={{ ["--track-color" as string]: accent }}
            >
              <div className="roadmap-card-head">
                <h2 className="roadmap-card-title">
                  <span className="track-dot" aria-hidden style={{ marginRight: 8 }} />
                  {t.name}
                </h2>
                <span className="roadmap-card-pct">{pct}%</span>
              </div>
              {t.description && <p className="roadmap-card-desc">{t.description}</p>}
              <div className="bar">
                <span
                  className="bar-fill-started"
                  style={{
                    width: t.material_count
                      ? `${(t.started_count / t.material_count) * 100}%`
                      : "0%",
                  }}
                />
                <span
                  className="bar-fill-mastered"
                  style={{
                    width: t.material_count
                      ? `${(t.mastered_count / t.material_count) * 100}%`
                      : "0%",
                  }}
                />
              </div>
              <div className="roadmap-card-foot">
                <span>
                  <strong>{t.material_count}</strong>materials
                </span>
                <span>
                  <strong>{t.started_count}</strong>started
                </span>
                <span>
                  <strong>{t.due_review_count}</strong>queued
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
