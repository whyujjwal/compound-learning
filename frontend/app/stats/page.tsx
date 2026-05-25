"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heatmap } from "@/components/Heatmap";
import { Sparkline } from "@/components/Sparkline";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { trackAccent } from "@/lib/trackColors";
import { api, type Stats } from "@/lib/api";

export default function StatsPage() {
  const { activity, setRightPanel } = useShell();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setRightPanel(
      <RightPanel>
        <PanelSection label="At a glance">
          {stats ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="stat">
                <span className="stat-num">{stats.reviews_today}</span>
                <span className="stat-label">reviews today</span>
              </div>
              <div className="stat">
                <span className="stat-num">{stats.sessions_this_week}</span>
                <span className="stat-label">sessions this week</span>
              </div>
              <div className="stat">
                <span className="stat-num">{stats.days_active_30d}</span>
                <span className="stat-label">active days · 30</span>
              </div>
            </div>
          ) : (
            <span style={{ color: "var(--fg-mute)" }}>—</span>
          )}
        </PanelSection>

        {stats && stats.due_cards > 0 && (
          <PanelSection label="Action">
            <Link href="/" className="v2-btn primary" style={{ width: "100%" }}>
              Start review →
            </Link>
          </PanelSection>
        )}
      </RightPanel>
    );
    return () => setRightPanel(null);
  }, [stats, setRightPanel]);

  if (loading) return <p style={{ color: "var(--fg-mute)" }}>Calculating…</p>;
  if (error) return <p style={{ color: "var(--bad)" }}>{error}</p>;
  if (!stats) return null;

  const maxReviews = Math.max(...stats.track_breakdown.map((t) => t.reviews_total), 1);
  const sparkData = activity.slice(-30).map((a) => a.count);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Stats</h1>
          <p className="page-sub">
            {stats.reviews_total} reviews · {Math.round(stats.retention_rate * 100)}% retention
          </p>
        </div>
      </header>

      <div className="stats-hero">
        <div className="stat">
          <span className="stat-num">{stats.reviews_total}</span>
          <span className="stat-label">Total reviews</span>
          <span className="stat-hint">all time</span>
        </div>
        <div className="stat">
          <span className="stat-num">{Math.round(stats.retention_rate * 100)}%</span>
          <span className="stat-label">Retention</span>
          <span className="stat-hint">good/easy / total</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.materials_mastered}</span>
          <span className="stat-label">Mastered</span>
          <span className="stat-hint">of {stats.total_materials}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.due_cards}</span>
          <span className="stat-label">Reviews queued</span>
          <span className="stat-hint">FSRS-due</span>
        </div>
      </div>

      <div className="stats-section-title">Activity</div>
      <div
        className="stats-cell"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <Heatmap data={activity} weeks={26} size={11} gap={3} />
        <Sparkline values={sparkData} height={48} width={640} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            paddingTop: 8,
            borderTop: "1px solid var(--hairline)",
          }}
        >
          <Stat num={stats.reviews_this_week} label="this week" />
          <Stat num={stats.sessions_this_week} label="sessions" />
          <Stat num={`${stats.current_streak}d`} label="streak" hint={`best ${stats.longest_streak}d`} />
          <Stat num={`${stats.avg_review_seconds}s`} label="avg per review" />
        </div>
      </div>

      <div className="stats-section-title">By track</div>
      <div className="track-bars">
        {stats.track_breakdown.map((t) => {
          const slug = t.track_name.toLowerCase().replace(/\s+/g, "-");
          const accent = trackAccent(slug, t.track_color);
          const pct = (t.reviews_total / maxReviews) * 100;
          return (
            <div
              className="track-bar-row"
              key={t.track_id}
              style={{ ["--track-color" as string]: accent }}
            >
              <span className="track-bar-name">
                <span className="track-dot" aria-hidden />
                {t.track_name}
              </span>
              <div className="track-bar-track">
                <div className="track-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="track-bar-stats">
                <strong>{t.reviews_total}</strong>reviews · <strong>{t.due_count}</strong>queued
              </span>
            </div>
          );
        })}
      </div>

      <div className="stats-section-title">Catalog</div>
      <div className="stats-grid">
        <div className="stats-cell">
          <Stat num={stats.total_tracks} label="tracks" />
        </div>
        <div className="stats-cell">
          <Stat num={stats.total_materials} label="materials" />
        </div>
        <div className="stats-cell">
          <Stat num={stats.total_cards} label="cards" />
        </div>
        <div className="stats-cell">
          <Stat num={stats.total_minutes_invested} label="minutes invested" />
        </div>
      </div>
    </>
  );
}

function Stat({ num, label, hint }: { num: number | string; label: string; hint?: string }) {
  return (
    <div className="stat">
      <span className="stat-num">{num}</span>
      <span className="stat-label">{label}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
