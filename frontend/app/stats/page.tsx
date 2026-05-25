"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { api, type Stats } from "@/lib/api";

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty">Calculating…</div>;
  if (error) return <div className="error-panel"><p>{error}</p></div>;
  if (!stats) return null;

  const maxReviews = Math.max(...stats.track_breakdown.map((t) => t.reviews_total), 1);

  return (
    <>
      <header className="roadmap-strip">
        <div className="roadmap-strip-left">
          <h1 className="roadmap-title">Stats</h1>
          <span className="roadmap-summary">
            {stats.reviews_total} reviews · {Math.round(stats.retention_rate * 100)}% retention
          </span>
        </div>
      </header>

      <div className="stats-row">
        <StatCard label="Total" value={stats.reviews_total} hint="reviews" />
        <StatCard label="This week" value={stats.reviews_this_week} />
        <StatCard label="Streak" value={`${stats.current_streak}d`} hint={`best ${stats.longest_streak}d`} />
        <StatCard label="Retention" value={`${Math.round(stats.retention_rate * 100)}%`} />
        <StatCard label="Due" value={stats.due_cards} />
        <StatCard label="Avg" value={`${stats.avg_review_seconds}s`} hint="per review" />
      </div>

      <div className="stats-row">
        <StatCard label="Tracks" value={stats.total_tracks} />
        <StatCard label="Materials" value={stats.total_materials} />
        <StatCard label="Cards" value={stats.total_cards} />
        <StatCard label="Today" value={stats.reviews_today} hint="reviews" />
      </div>

      <h2 className="section-title">By track</h2>
      <div className="track-bar-list">
        {stats.track_breakdown.map((track) => (
          <div key={track.track_id} className="track-bar-item">
            <div className="track-bar-header">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="dot" style={{ background: track.track_color }} />
                {track.track_name}
              </span>
              <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.8rem", fontFamily: "var(--mono)" }}>
                {track.reviews_total} reviews · {track.due_count} due
              </span>
            </div>
            <div className="track-bar">
              <div
                className="track-bar-fill"
                style={{
                  width: `${(track.reviews_total / maxReviews) * 100}%`,
                  background: track.track_color,
                }}
              />
            </div>
            <div className="track-bar-meta">
              {track.material_count} materials · {track.card_count} cards
            </div>
          </div>
        ))}
      </div>

      {stats.due_cards > 0 && (
        <div className="actions" style={{ marginTop: "1.75rem" }}>
          <Link href="/" className="btn primary">Start review →</Link>
          <Link href="/coach" className="btn">Ask Coach what to focus on</Link>
        </div>
      )}
    </>
  );
}
