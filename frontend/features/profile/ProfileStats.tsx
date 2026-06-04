"use client";

import { Skeleton, Badge } from "@/components/primitives";
import type { Stats } from "@/lib/api/types";

/* ─── Stat card ─────────────────────────────────────────────── */
function StatCard({
  value,
  label,
  sub,
  loading,
}: {
  value: string;
  label: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        background: "var(--panel)",
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {loading ? (
        <>
          <Skeleton width={56} height={28} borderRadius={4} />
          <Skeleton width={72} height={12} borderRadius={3} style={{ marginTop: 4 }} />
        </>
      ) : (
        <>
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {value}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {label}
          </span>
          {sub && (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</span>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Inline SVG Activity Heatmap ───────────────────────────── */
function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const WEEKS = 26;
  const CELL = 11;
  const GAP = 3;
  const STEP = CELL + GAP;

  // Build a map of date → count
  const countMap = new Map<string, number>();
  for (const d of data) countMap.set(d.date, d.count);

  // Determine max for opacity scaling
  const max = Math.max(...data.map((d) => d.count), 1);

  // Build grid: array of columns (weeks), each column = array of 7 days
  const today = new Date();
  // Start from N weeks back, aligned to Sunday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - WEEKS * 7 - startDate.getDay());

  const columns: { date: string; count: number }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const key = date.toISOString().slice(0, 10);
      week.push({ date: key, count: countMap.get(key) ?? 0 });
    }
    columns.push(week);
  }

  const width = WEEKS * STEP - GAP;
  const height = 7 * STEP - GAP;

  return (
    <svg
      width={width}
      height={height}
      aria-label="Activity heatmap"
      style={{ display: "block", overflow: "visible" }}
    >
      {columns.map((week, wi) =>
        week.map((day, di) => {
          const opacity = day.count === 0 ? 0 : Math.max(0.15, day.count / max);
          return (
            <rect
              key={`${wi}-${di}`}
              x={wi * STEP}
              y={di * STEP}
              width={CELL}
              height={CELL}
              rx={2}
              fill={day.count === 0 ? "var(--overlay-hover)" : "var(--accent)"}
              fillOpacity={day.count === 0 ? 1 : opacity}
              style={{ transition: "fill-opacity 100ms" }}
            >
              <title>{`${day.date}: ${day.count} review${day.count !== 1 ? "s" : ""}`}</title>
            </rect>
          );
        })
      )}
    </svg>
  );
}

/* ─── Inline Retention Sparkline ────────────────────────────── */
function RetentionSparkline({
  data,
}: {
  data: { date: string; retention: number; reviews: number }[];
}) {
  if (data.length < 2) return null;

  const W = 240;
  const H = 52;
  const PAD = 4;

  const retentions = data.map((d) => d.retention);
  const minR = Math.min(...retentions);
  const maxR = Math.max(...retentions);
  const range = maxR - minR || 0.01;

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - 2 * PAD);
    const y = PAD + (1 - (d.retention - minR) / range) * (H - 2 * PAD);
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");

  // Area fill path
  const areaPath =
    `M${pts[0]}` +
    ` L${pts.join(" L")}` +
    ` L${PAD + (W - 2 * PAD)},${H - PAD}` +
    ` L${PAD},${H - PAD} Z`;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-label="Retention over time"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="ret-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* area */}
      <path d={areaPath} fill="url(#ret-fill)" />
      {/* line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* endpoint dot */}
      {pts.length > 0 && (() => {
        const last = pts[pts.length - 1].split(",");
        return (
          <circle
            cx={parseFloat(last[0])}
            cy={parseFloat(last[1])}
            r={3}
            fill="var(--accent)"
          />
        );
      })()}
    </svg>
  );
}

/* ─── Track mastery bars ────────────────────────────────────── */
function TrackBars({
  breakdown,
}: {
  breakdown: Stats["track_breakdown"];
}) {
  const max = Math.max(...breakdown.map((t) => t.reviews_total), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {breakdown.map((t) => {
        const pct = (t.reviews_total / max) * 100;
        // Simple hue derived from track_color (hex) or fallback accent
        const color = t.track_color?.startsWith("#") ? t.track_color : "var(--accent)";
        return (
          <div key={t.track_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }}
              aria-hidden
            />
            <span
              style={{
                fontSize: 13,
                color: "var(--text)",
                width: 160,
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {t.track_name}
            </span>
            <div
              style={{
                flex: 1,
                height: 4,
                background: "var(--overlay-hover)",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 99,
                  transition: "width 300ms var(--ease-out)",
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0, minWidth: 64, textAlign: "right" }}>
              {t.reviews_total.toLocaleString()} reviews
            </span>
            {t.due_count > 0 && (
              <Badge color="warn" style={{ flexShrink: 0 }}>
                {t.due_count} due
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Props ─────────────────────────────────────────────────── */
interface ProfileStatsProps {
  stats: Stats | null;
  activity: { date: string; count: number }[];
  retentionTimeline: { date: string; retention: number; reviews: number }[];
  loading: boolean;
}

/* ─── Component ─────────────────────────────────────────────── */
export function ProfileStats({ stats, activity, retentionTimeline, loading }: ProfileStatsProps) {
  return (
    <div>
      {/* Key numbers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatCard
          loading={loading}
          value={stats ? `${Math.round(stats.retention_rate * 100)}%` : "—"}
          label="Retention"
          sub="good+easy / total"
        />
        <StatCard
          loading={loading}
          value={stats ? `${stats.current_streak}d` : "—"}
          label="Streak"
          sub={stats ? `best ${stats.longest_streak}d` : undefined}
        />
        <StatCard
          loading={loading}
          value={stats ? String(stats.materials_mastered) : "—"}
          label="Mastered"
          sub={stats ? `of ${stats.total_materials}` : undefined}
        />
        <StatCard
          loading={loading}
          value={stats ? stats.reviews_total.toLocaleString() : "—"}
          label="Reviews"
          sub="all time"
        />
      </div>

      {/* Retention sparkline + activity heatmap */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 32,
          alignItems: "start",
          marginBottom: 28,
        }}
      >
        {/* Retention sparkline */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            Retention (30 days)
          </div>
          {loading ? (
            <Skeleton width={240} height={52} />
          ) : retentionTimeline.length >= 2 ? (
            <RetentionSparkline data={retentionTimeline} />
          ) : (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Not enough data yet</div>
          )}
        </div>

        {/* Activity heatmap */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            Activity (26 weeks)
          </div>
          {loading ? (
            <Skeleton width={310} height={90} />
          ) : activity.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <ActivityHeatmap data={activity} />
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>No activity yet</div>
          )}
        </div>
      </div>

      {/* Per-track breakdown */}
      {!loading && stats && stats.track_breakdown.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            By track
          </div>
          <TrackBars breakdown={stats.track_breakdown} />
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton height={14} />
          <Skeleton height={14} width="80%" />
          <Skeleton height={14} width="60%" />
        </div>
      )}
    </div>
  );
}
