"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TrackMap } from "@/components/learning/TrackMap";
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
  const [view, setView] = useState<"syllabus" | "map" | "materials">("syllabus");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    api.getCatalogTrack(id).then(setTrack).catch((err) => setMessage(err instanceof Error ? err.message : "Could not load track."));
  }, [id]);

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
  const modules = track.modules ?? [];
  const defaultExpanded = new Set(modules.slice(0, 2).map((module) => module.id));
  const expanded = expandedModules.size ? expandedModules : defaultExpanded;
  const outcomes = track.learning_outcomes?.length
    ? track.learning_outcomes
    : [
        track.description ?? "Understand the complete learning path before adopting this track.",
        "Inspect each module, material, quiz, and project checkpoint.",
        "Adopt a private copy when the syllabus matches your goals.",
      ];

  function toggleModule(id: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
            {track.estimated_hours && <span>{track.estimated_hours} hours</span>}
            {track.difficulty && <span>{track.difficulty}</span>}
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

      <div className="track-syllabus-outcomes">
        {outcomes.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
      </div>

      <div className="track-view-tabs">
        {(["syllabus", "map", "materials"] as const).map((mode) => (
          <button key={mode} type="button" className={`explore-filter-btn${view === mode ? " active" : ""}`} onClick={() => setView(mode)}>
            {mode === "map" ? "Map" : mode === "materials" ? "Materials" : "Syllabus"}
          </button>
        ))}
      </div>

      {view === "map" && <TrackMap modules={modules} accent={accent} title={track.name} />}

      {view === "syllabus" && <div className="catalog-module-list">
        {modules.map((module) => {
          const isOpen = expanded.has(module.id);
          return (
          <article key={module.id} className="track-module" style={{ ["--track-color" as string]: accent }}>
            <div className="track-module-main">
              <button type="button" className="syllabus-module-toggle" onClick={() => toggleModule(module.id)}>
                <div>
                  <h2>{module.title}</h2>
                  <p>{module.objective}</p>
                </div>
                <span className="syllabus-module-chevron">{isOpen ? "-" : "+"}</span>
              </button>
              <div className="track-module-meta">
                <span>{module.material_count} materials</span>
                <span>{module.estimated_minutes} minutes</span>
                <span>{module.difficulty}</span>
              </div>
              <div className="track-module-quality">
                {module.materials.slice(0, 8).map((material) => (
                  <span key={material.id}>{material.resource_type ?? "material"} · {material.resource_health_status}</span>
                ))}
              </div>
            </div>
            {isOpen && <div className="track-module-materials">
              {module.materials.map((material) => (
                <a
                  key={material.id}
                  href={material.external_url ?? "#"}
                  target={material.external_url ? "_blank" : undefined}
                  rel={material.external_url ? "noreferrer" : undefined}
                  className="track-module-material"
                >
                  <span>{material.title}</span>
                  <small>{material.estimated_minutes}m · {Math.round(material.resource_quality_score ?? 0)}</small>
                </a>
              ))}
            </div>}
          </article>
        );})}
      </div>}

      {view === "materials" && (
        <div className="track-module-materials">
          {track.materials.map((material) => (
            <a key={material.id} href={material.external_url ?? "#"} target={material.external_url ? "_blank" : undefined} rel={material.external_url ? "noreferrer" : undefined} className="track-module-material">
              <span>{material.title}</span>
              <small>{material.resource_type ?? "material"} · {material.estimated_minutes}m</small>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
