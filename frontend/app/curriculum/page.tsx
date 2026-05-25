"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { resourceAction } from "@/lib/resourceAction";
import { api, type CurriculumOverview, type Material } from "@/lib/api";

export default function CurriculumPage() {
  const [overview, setOverview] = useState<CurriculumOverview | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, m] = await Promise.all([api.getCurriculumOverview(), api.getMaterials()]);
      setOverview(o);
      setMaterials(m);
      setExpandedTrack((prev) => prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load curriculum");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="empty">Loading roadmap…</div>;

  if (error) {
    return (
      <div className="error-panel">
        <p>{error}</p>
        <button className="primary" onClick={load} style={{ marginTop: "1rem" }}>
          Retry
        </button>
      </div>
    );
  }

  const trackMaterials = (trackId: string) =>
    materials.filter((m) => m.track_id === trackId).sort((a, b) => a.sequence - b.sequence);

  const totalStarted = overview?.total_started ?? 0;
  const totalMastered = overview?.total_mastered ?? 0;
  const totalMaterials = overview?.total_materials ?? 0;
  const dueReviews = overview?.due_reviews ?? 0;

  return (
    <div className="roadmap-shell">
      <header className="roadmap-strip">
        <div className="roadmap-strip-left">
          <h1 className="roadmap-title">Roadmap</h1>
          <span className="roadmap-summary">
            {totalStarted}/{totalMaterials} started · {totalMastered} mastered · {dueReviews} reviews due
          </span>
        </div>
      </header>

      <div className="track-dashboard">
        {overview?.tracks.map((track) => {
          const open = expandedTrack === track.slug;
          const pctStarted = track.material_count
            ? Math.round((track.started_count / track.material_count) * 100)
            : 0;
          const pctMastered = track.material_count
            ? Math.round((track.mastered_count / track.material_count) * 100)
            : 0;
          return (
            <article
              key={track.slug}
              className="track-row"
              style={{ ["--track-accent" as string]: track.color }}
            >
              <header className="track-row-head">
                <button
                  type="button"
                  className="track-row-meta"
                  onClick={() => setExpandedTrack(open ? null : track.slug)}
                  aria-expanded={open}
                >
                  <span className="track-row-caret" aria-hidden>
                    {open ? "▾" : "▸"}
                  </span>
                  <span className="track-row-name">{track.name}</span>
                  {track.due_review_count > 0 && (
                    <span className="track-row-due">{track.due_review_count} due</span>
                  )}
                </button>
                <div className="track-row-actions">
                  <Link
                    href="/"
                    className="btn ghost track-continue"
                    title={track.next_material ? `Next: ${track.next_material}` : "Open today"}
                  >
                    Continue <span aria-hidden>→</span>
                  </Link>
                </div>
              </header>

              <div className="track-row-progress">
                <div className="track-progress-bar" title={`${pctStarted}% started`}>
                  <div
                    className="track-progress-fill-mastered"
                    style={{ width: `${pctMastered}%` }}
                  />
                  <div
                    className="track-progress-fill-started"
                    style={{
                      width: `${Math.max(pctStarted - pctMastered, 0)}%`,
                      left: `${pctMastered}%`,
                    }}
                  />
                </div>
                <div className="track-progress-numbers">
                  <span>
                    <strong>{track.started_count}</strong>/{track.material_count}
                    <span className="muted"> started</span>
                  </span>
                  <span>
                    <strong>{track.mastered_count}</strong>
                    <span className="muted"> mastered ({pctMastered}%)</span>
                  </span>
                  {track.next_material && (
                    <span className="track-progress-next">
                      <span className="muted">next:</span> {track.next_material}
                    </span>
                  )}
                </div>
              </div>

              {open && (
                <div className="track-block-list">
                  {track.blocks.map((block) => {
                    const blockKey = `${track.slug}::${block.label}`;
                    const blockOpen = expandedBlock === blockKey;
                    const mats = trackMaterials(track.id).filter(
                      (m) => (m.block_label || "Uncategorized") === block.label
                    );
                    const pct = block.material_count
                      ? Math.round((block.mastered_count / block.material_count) * 100)
                      : 0;
                    return (
                      <div key={blockKey} className="track-block">
                        <button
                          type="button"
                          className="track-block-head"
                          onClick={() => setExpandedBlock(blockOpen ? null : blockKey)}
                        >
                          <span className="track-block-label">{block.label}</span>
                          <span className="track-block-stat">
                            {block.mastered_count}/{block.material_count} mastered
                            <span className="track-block-pct"> · {pct}%</span>
                          </span>
                        </button>
                        {blockOpen && (
                          <div className="card-list">
                            {mats.map((mat) => (
                              <div key={mat.id} className="list-item block-item">
                                <div className="block-item-main">
                                  <h4>{mat.title}</h4>
                                  <div className="meta-row">
                                    <span className="badge">{mat.estimated_minutes}m</span>
                                    {mat.resource_type && (
                                      <span className="badge">{mat.resource_type}</span>
                                    )}
                                    {mat.card_state && <span className="badge">{mat.card_state}</span>}
                                  </div>
                                </div>
                                <div className="block-item-actions">
                                  {mat.external_url && (() => {
                                    const a = resourceAction(mat.resource_type);
                                    return (
                                      <a
                                        href={mat.external_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`btn primary practice-btn ${a.className}`}
                                      >
                                        <span aria-hidden className="resource-icon">{a.icon}</span>
                                        {a.shortLabel} ↗
                                      </a>
                                    );
                                  })()}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
