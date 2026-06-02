"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heatmap } from "@/components/Heatmap";
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

  return (
    <>
      <header className="page-head">
        <div>
          <p className="page-kicker">compound analytics</p>
          <h1 className="page-title">Stats</h1>
          <p className="page-sub">
            Small repetitions, layered over time, turning into durable mastery.
          </p>
        </div>
      </header>

      <section className="compound-principle">
        <div>
          <span className="compound-principle-label">Why compound?</span>
          <h2>Each block leaves residue for the next one.</h2>
        </div>
        <p>
          Reviews strengthen memory, sessions create rhythm, and mastered material becomes the base layer
          for harder work. The app is named for that accumulation.
        </p>
      </section>

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

      <div className="analytics-grid">
        <section className="analytics-card analytics-card-wide">
          <div className="analytics-card-head">
            <div>
              <span className="stats-section-title">Activity</span>
              <h2>Review flow</h2>
            </div>
            <span className="analytics-pill">last 42 days</span>
          </div>
          <ActivityFlow data={activity.slice(-42)} />
          <div className="stats-heatmap-strip">
            <Heatmap data={activity} weeks={26} size={11} gap={3} />
          </div>
        </section>

        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="stats-section-title">Mastery</span>
              <h2>Material state</h2>
            </div>
          </div>
          <MasteryDonut
            mastered={stats.materials_mastered}
            started={stats.materials_started}
            total={stats.total_materials}
          />
        </section>

        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="stats-section-title">Compounding loop</span>
              <h2>How work stacks</h2>
            </div>
          </div>
          <CompoundDiagram stats={stats} />
        </section>

        <section className="analytics-card analytics-card-wide">
          <div className="analytics-card-head">
            <div>
              <span className="stats-section-title">Track map</span>
              <h2>Where effort is accumulating</h2>
            </div>
            <span className="analytics-pill">{stats.track_breakdown.length} tracks</span>
          </div>
          <TrackMatrix tracks={stats.track_breakdown} />
        </section>

        <section className="analytics-card analytics-mini-grid">
          <Stat num={stats.reviews_this_week} label="this week" />
          <Stat num={stats.sessions_this_week} label="sessions" />
          <Stat num={`${stats.current_streak}d`} label="streak" hint={`best ${stats.longest_streak}d`} />
          <Stat num={`${stats.avg_review_seconds}s`} label="avg per review" />
        </section>
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

function ActivityFlow({ data }: { data: { date: string; count: number }[] }) {
  const width = 760;
  const height = 230;
  const pad = 24;
  const values = data.map((d) => d.count);
  const max = Math.max(1, ...values);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(1, values.length - 1)) * innerW;
    const y = pad + innerH - (v / max) * innerH;
    return [x, y] as const;
  });
  const path = points.length ? smoothPath(points) : "";
  const area = points.length
    ? `${path} L${points[points.length - 1][0]},${height - pad} L${points[0][0]},${height - pad} Z`
    : "";

  return (
    <svg className="activity-flow" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Review activity over time">
      <defs>
        <linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--focus-teal)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--focus-teal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={pad}
          x2={width - pad}
          y1={pad + (innerH / 3) * i}
          y2={pad + (innerH / 3) * i}
          className="activity-flow-grid"
        />
      ))}
      {points.map(([x, y], i) => (
        <rect
          key={i}
          x={x - 3}
          y={y}
          width="6"
          height={height - pad - y}
          rx="3"
          className="activity-flow-bar"
        >
          <title>{`${data[i]?.date ?? "day"}: ${values[i]} reviews`}</title>
        </rect>
      ))}
      {area && <path d={area} fill="url(#activity-fill)" />}
      {path && <path d={path} className="activity-flow-line" />}
    </svg>
  );
}

function MasteryDonut({ mastered, started, total }: { mastered: number; started: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  const masteredPct = Math.min(100, Math.round((mastered / safeTotal) * 100));
  const startedOnly = Math.max(0, started - mastered);
  const startedPct = Math.min(100 - masteredPct, Math.round((startedOnly / safeTotal) * 100));
  const remaining = Math.max(0, total - started);

  return (
    <div className="mastery-donut-wrap">
      <svg className="mastery-donut" viewBox="0 0 120 120" aria-label={`${masteredPct}% mastered`}>
        <circle cx="60" cy="60" r="44" className="mastery-donut-bg" />
        <circle
          cx="60"
          cy="60"
          r="44"
          className="mastery-donut-started"
          strokeDasharray={`${startedPct} ${100 - startedPct}`}
          pathLength="100"
        />
        <circle
          cx="60"
          cy="60"
          r="44"
          className="mastery-donut-mastered"
          strokeDasharray={`${masteredPct} ${100 - masteredPct}`}
          pathLength="100"
        />
        <text x="60" y="56" textAnchor="middle" className="mastery-donut-num">{masteredPct}%</text>
        <text x="60" y="72" textAnchor="middle" className="mastery-donut-label">mastered</text>
      </svg>
      <div className="mastery-legend">
        <span><i className="legend-mastered" /> {mastered} mastered</span>
        <span><i className="legend-started" /> {startedOnly} in motion</span>
        <span><i className="legend-rest" /> {remaining} untouched</span>
      </div>
    </div>
  );
}

function CompoundDiagram({ stats }: { stats: Stats }) {
  const nodes = [
    { label: "Reviews", value: stats.reviews_total },
    { label: "Rhythm", value: `${stats.current_streak}d` },
    { label: "Mastery", value: stats.materials_mastered },
  ];
  return (
    <div className="compound-diagram" aria-label="Compound learning loop">
      {nodes.map((node, i) => (
        <div className="compound-node" key={node.label}>
          <span className="compound-node-index">0{i + 1}</span>
          <strong>{node.value}</strong>
          <span>{node.label}</span>
        </div>
      ))}
    </div>
  );
}

function TrackMatrix({
  tracks,
}: {
  tracks: Stats["track_breakdown"];
}) {
  if (tracks.length === 0) {
    return <div className="track-matrix-empty">Create tracks to see your effort map.</div>;
  }

  const width = 760;
  const height = 250;
  const maxReviews = Math.max(1, ...tracks.map((t) => t.reviews_total));
  const maxDue = Math.max(1, ...tracks.map((t) => t.due_count));
  const maxCards = Math.max(1, ...tracks.map((t) => t.card_count));

  return (
    <svg className="track-matrix" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Track effort map">
      <line x1="56" y1="198" x2="714" y2="198" className="track-matrix-axis" />
      <line x1="56" y1="24" x2="56" y2="198" className="track-matrix-axis" />
      {tracks.map((track, i) => {
        const x = 76 + (track.reviews_total / maxReviews) * 610;
        const y = 188 - (track.due_count / maxDue) * 142;
        const r = 12 + (track.card_count / maxCards) * 24;
        const color = trackAccent(track.track_name.toLowerCase().replace(/\s+/g, "-"), track.track_color);
        return (
          <g key={track.track_id}>
            <circle cx={x} cy={y} r={r} fill={color} className="track-matrix-bubble" />
            <text x={x} y={Math.max(18, y - r - 8)} textAnchor="middle" className="track-matrix-label">
              {track.track_name}
            </text>
            <title>{`${track.track_name}: ${track.reviews_total} reviews, ${track.due_count} queued, ${track.card_count} cards`}</title>
          </g>
        );
      })}
      <text x="386" y="226" textAnchor="middle" className="track-matrix-caption">reviews accumulated</text>
      <text x="18" y="112" textAnchor="middle" className="track-matrix-caption track-matrix-caption-y">queued pressure</text>
    </svg>
  );
}

function smoothPath(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length === 0) return "";
  if (points.length < 2) {
    const [x, y] = points[0];
    return `M${x},${y}`;
  }
  let path = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i === 0 ? i : i - 1];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;
    path += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }
  return path;
}
