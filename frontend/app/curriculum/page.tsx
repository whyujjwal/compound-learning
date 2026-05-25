"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { trackAccent } from "@/lib/trackColors";

export default function RoadmapPage() {
  const { overview, setRightPanel } = useShell();

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
          <h1 className="roadmap-title">Roadmap</h1>
          <p style={{ color: "var(--fg-mute)", fontSize: 13, marginTop: 4 }}>
            Four tracks. {overview.total_materials} materials. Pick one and start.
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
        </div>
      </header>

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
