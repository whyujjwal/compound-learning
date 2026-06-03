"use client";

import { Heatmap } from "@/components/Heatmap";
import { trackAccent } from "@/lib/trackColors";
import { type Stats } from "@/lib/api";

interface Props {
  stats: Stats | null;
  activity: { date: string; count: number }[];
}

export function ProfileStats({ stats, activity }: Props) {
  if (!stats) {
    return (
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Progress</h2>
            <p style={{ color: "var(--fg-mute)" }}>Loading your stats…</p>
          </div>
        </div>
      </section>
    );
  }

  const maxReviews = Math.max(...stats.track_breakdown.map((t) => t.reviews_total), 1);

  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <div>
          <h2>Progress</h2>
          <p>Reviews, retention, and mastery over time.</p>
        </div>
      </div>

      {/* Key numbers */}
      <div className="stats-hero" style={{ margin: "var(--s-4) 0" }}>
        <div className="stat">
          <span className="stat-num">{Math.round(stats.retention_rate * 100)}%</span>
          <span className="stat-label">Retention</span>
          <span className="stat-hint">good+easy / total</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.current_streak}d</span>
          <span className="stat-label">Streak</span>
          <span className="stat-hint">best {stats.longest_streak}d</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.materials_mastered}</span>
          <span className="stat-label">Mastered</span>
          <span className="stat-hint">of {stats.total_materials}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.reviews_total}</span>
          <span className="stat-label">Reviews</span>
          <span className="stat-hint">all time</span>
        </div>
      </div>

      {/* Heatmap */}
      {activity.length > 0 && (
        <div style={{ marginBottom: "var(--s-5)" }}>
          <div className="stats-section-title" style={{ marginTop: 0 }}>Activity</div>
          <div className="stats-heatmap-strip" style={{ overflowX: "auto" }}>
            <Heatmap data={activity} weeks={26} size={11} gap={3} />
          </div>
        </div>
      )}

      {/* Per-track mastery bars */}
      {stats.track_breakdown.length > 0 && (
        <>
          <div className="stats-section-title" style={{ marginTop: 0 }}>By track</div>
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
                    <strong>{t.reviews_total}</strong> reviews&nbsp;·&nbsp;<strong>{t.due_count}</strong> queued
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
