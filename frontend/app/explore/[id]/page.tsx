"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { api, type CatalogTrackDetail } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";

export default function PublicTrackDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { reloadAll, setRightPanel } = useShell();
  const [track, setTrack] = useState<CatalogTrackDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (!id) return;
    api.getCatalogTrack(id).then(setTrack).catch((err) => setMessage(err instanceof Error ? err.message : "Could not load track."));
  }, [id]);

  const modules = useMemo(() => {
    const map = new Map<string, CatalogTrackDetail["materials"]>();
    for (const material of track?.materials ?? []) {
      const key = material.block_label || "Core";
      map.set(key, [...(map.get(key) ?? []), material]);
    }
    return Array.from(map.entries());
  }, [track]);

  useEffect(() => {
    setRightPanel(
      track ? (
        <RightPanel>
          <PanelSection label="Trust signals">
            <div className="catalog-score-panel">
              <span><strong>{Math.round(track.quality_score)}</strong> quality</span>
              <span><strong>{track.star_count}</strong> stars</span>
              <span><strong>{track.adoption_count}</strong> adoptions</span>
              <span><strong>{track.rating_avg.toFixed(1)}</strong> rating</span>
            </div>
          </PanelSection>
          <PanelSection label="Creator">
            <Link href={`/creator/${track.creator_id}`} className="v2-btn ghost">
              View creator profile
            </Link>
          </PanelSection>
        </RightPanel>
      ) : null
    );
    return () => setRightPanel(null);
  }, [setRightPanel, track]);

  async function adopt() {
    if (!track) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.adoptCatalogTrack(track.id);
      await reloadAll();
      setMessage(`Added to your library with ${result.materials_created} materials.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not adopt track.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStar() {
    if (!track) return;
    setBusy(true);
    try {
      const updated = track.is_starred
        ? await api.unstarCatalogTrack(track.id)
        : await api.starCatalogTrack(track.id);
      setTrack({ ...track, ...updated });
    } finally {
      setBusy(false);
    }
  }

  async function submitRating() {
    if (!track) return;
    setBusy(true);
    try {
      const updated = await api.rateCatalogTrack(track.id, rating);
      setTrack({ ...track, ...updated });
      setMessage("Rating saved. That signal helps better tracks rise.");
    } finally {
      setBusy(false);
    }
  }

  if (!track) {
    return <p style={{ color: "var(--fg-mute)" }}>{message ?? "Loading public track..."}</p>;
  }

  const accent = trackAccent(track.slug, track.color);

  return (
    <>
      <header className="catalog-detail-hero" style={{ ["--track-color" as string]: accent }}>
        <div>
          <p className="page-kicker">Public track</p>
          <h1>{track.name}</h1>
          <p>{track.description ?? "A public AI-generated learning track with structured materials."}</p>
          <div className="explore-card-meta">
            <span>{track.material_count} materials</span>
            <span>{track.module_count} modules</span>
            <span>{Math.round(track.quality.resource_score)} resource score</span>
            <span>{track.quality.quiz_count} quizzes</span>
            <span>{track.quality.project_count} projects</span>
          </div>
        </div>
        <div className="catalog-detail-actions">
          <button type="button" className="v2-btn primary" onClick={adopt} disabled={busy}>
            Adopt track
          </button>
          <button type="button" className="v2-btn ghost" onClick={toggleStar} disabled={busy}>
            {track.is_starred ? "Starred" : "Star"}
          </button>
          <Link href="/curriculum/build" className="v2-btn ghost">
            Remix
          </Link>
        </div>
      </header>

      {message && <p className="week-canvas-message">{message}</p>}

      <section className="catalog-rating">
        <div>
          <span>Rate this track</span>
          <strong>{track.rating_count ? `${track.rating_avg.toFixed(1)} from ${track.rating_count} ratings` : "No ratings yet"}</strong>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        />
        <button type="button" className="v2-btn" onClick={submitRating} disabled={busy}>
          Save {rating}/5
        </button>
      </section>

      <div className="catalog-module-list">
        {modules.map(([module, materials]) => (
          <article key={module} className="track-module" style={{ ["--track-color" as string]: accent }}>
            <div className="track-module-main">
              <div className="track-module-head">
                <div>
                  <h2>{module}</h2>
                  <p>{materials.length} materials · {materials.reduce((sum, m) => sum + m.estimated_minutes, 0)} minutes</p>
                </div>
                <span className="track-module-pct">
                  {Math.round(materials.reduce((sum, m) => sum + m.resource_quality_score, 0) / Math.max(1, materials.length))}
                </span>
              </div>
              <div className="track-module-quality">
                {materials.slice(0, 8).map((material) => (
                  <span key={material.id}>{material.resource_type ?? "material"} · {material.resource_health_status}</span>
                ))}
              </div>
            </div>
            <div className="track-module-materials">
              {materials.map((material) => (
                <a
                  key={material.id}
                  href={material.external_url ?? "#"}
                  target={material.external_url ? "_blank" : undefined}
                  rel={material.external_url ? "noreferrer" : undefined}
                  className="track-module-material"
                >
                  <span>{material.title}</span>
                  <small>{material.estimated_minutes}m · {Math.round(material.resource_quality_score)}</small>
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
