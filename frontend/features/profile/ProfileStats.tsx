"use client";

import { Skeleton, Badge } from "@/components/primitives";
import { ContributionGraph } from "@/components/charts/ContributionGraph";
import { LineChart } from "@/components/charts/LineChart";
import type { Stats } from "@/lib/api/types";

/* ─── Props (preserved from original — page.tsx passes these) ── */
interface ProfileStatsProps {
  stats: Stats | null;
  activity: { date: string; count: number }[];
  retentionTimeline: { date: string; retention: number; reviews: number }[];
  loading: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* ─── Flame SVG icon (accent-colored, no emoji) ──────────────── */
function FlameIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path
        d="M7 13c-2.76 0-5-2.01-5-4.5 0-1.5.8-2.8 2-3.6.1 1 .6 1.8 1.3 2.3C5.1 5.6 5.5 3.8 7 2c0 0-.1 2.5 1.5 3.2C9.5 5.7 10 4.6 10 4.6 11.3 5.6 12 7.1 12 8.5c0 2.49-2.24 4.5-5 4.5Z"
        fill="var(--accent)"
        opacity="0.85"
      />
      <path
        d="M7 11c-1.1 0-2-.8-2-1.8 0-.6.3-1.1.8-1.5 0 .4.2.8.6.9C6.2 8 6.4 7 7 6.3c0 0 0 1 .6 1.3.4.2.6-.2.6-.2.5.4.8 1 .8 1.6C9 10.2 8.1 11 7 11Z"
        fill="var(--canvas)"
        opacity="0.6"
      />
    </svg>
  );
}

/* ─── Section heading ────────────────────────────────────────── */
function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Stat card ─────────────────────────────────────────────── */
function StatCard({
  value,
  label,
  sub,
  loading,
  icon,
  accent,
}: {
  value: string;
  label: string;
  sub?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        background: "var(--canvas)",
        minWidth: 0,
      }}
    >
      {loading ? (
        <>
          <Skeleton width={56} height={26} borderRadius={4} />
          <Skeleton width={64} height={11} borderRadius={3} style={{ marginTop: 4 }} />
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {icon}
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: accent ? "var(--accent)" : "var(--text)",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </span>
          {sub && (
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</span>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Track mastery rows ─────────────────────────────────────── */
function TrackMasteryRows({ breakdown, loading }: { breakdown: Stats["track_breakdown"]; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={14} style={{ width: `${70 + i * 8}%` }} />
        ))}
      </div>
    );
  }

  if (!breakdown.length) {
    return (
      <div style={{ fontSize: 13, color: "var(--muted)" }}>
        No tracks yet — add a track to see your breakdown.
      </div>
    );
  }

  const maxReviews = Math.max(...breakdown.map((t) => t.reviews_total), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {breakdown.map((t) => {
        const pct = (t.reviews_total / maxReviews) * 100;
        const masteryPct =
          t.material_count > 0
            ? Math.round(((t.card_count - t.due_count) / Math.max(t.card_count, 1)) * 100)
            : 0;
        const color = t.track_color?.startsWith("#") ? t.track_color : "var(--accent)";

        return (
          <div key={t.track_id}>
            {/* Row header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: color,
                  flexShrink: 0,
                }}
                aria-hidden
              />
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.track_name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {t.reviews_total.toLocaleString()} reviews
              </span>
              {t.due_count > 0 && (
                <Badge color="warn" style={{ flexShrink: 0 }}>
                  {t.due_count} due
                </Badge>
              )}
            </div>

            {/* Progress bar */}
            <div
              style={{
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
                  transition: "width 400ms var(--ease-out)",
                }}
              />
            </div>

            {/* Mastery label */}
            <div style={{ marginTop: 3 }}>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>
                {t.card_count - t.due_count}/{t.card_count} cards active · {masteryPct}% up to date
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────── */
export function ProfileStats({ stats, activity, retentionTimeline, loading }: ProfileStatsProps) {
  /* ── Stat card values ── */
  const currentStreak = stats?.current_streak ?? 0;
  const longestStreak = stats?.longest_streak ?? 0;
  const retentionPct = stats ? Math.round(stats.retention_rate * 100) : 0;
  const reviewsTotal = stats?.reviews_total ?? 0;
  const minutesTotal = stats?.total_minutes_invested ?? 0;
  const mastered = stats?.materials_mastered ?? 0;
  const totalMaterials = stats?.total_materials ?? 0;

  /* ── Retention line chart data ── */
  const retentionPoints = retentionTimeline.map((d) => ({
    label: d.date,
    value: Math.round(d.retention * 100),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
      {/* ── Section: Key numbers ── */}
      <div>
        <SubHeading>Overview</SubHeading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
          }}
        >
          <StatCard
            loading={loading}
            value={`${currentStreak}d`}
            label="Current streak"
            sub={`best ${longestStreak}d`}
            icon={<FlameIcon size={16} />}
            accent
          />
          <StatCard
            loading={loading}
            value={`${longestStreak}d`}
            label="Longest streak"
          />
          <StatCard
            loading={loading}
            value={`${retentionPct}%`}
            label="Retention"
            sub="good+easy / total"
          />
          <StatCard
            loading={loading}
            value={reviewsTotal.toLocaleString()}
            label="Reviews"
            sub="all time"
          />
          <StatCard
            loading={loading}
            value={fmtMinutes(minutesTotal)}
            label="Minutes invested"
          />
          <StatCard
            loading={loading}
            value={`${mastered}/${totalMaterials}`}
            label="Mastered"
            sub="materials"
          />
        </div>
      </div>

      {/* ── Section: Activity heatmap ── */}
      <div>
        <SubHeading>Activity</SubHeading>
        {loading ? (
          <Skeleton height={120} borderRadius={4} />
        ) : activity.length > 0 ? (
          <ContributionGraph
            data={activity}
            weeks={53}
            colorScheme="accent"
            cellSize={11}
            gap={3}
            showFooter
          />
        ) : (
          <div
            style={{
              padding: "24px 0",
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            No activity recorded yet. Complete your first review to start tracking.
          </div>
        )}
      </div>

      {/* ── Section: Retention over time ── */}
      <div>
        <SubHeading>Retention over time</SubHeading>
        {loading ? (
          <Skeleton height={80} borderRadius={4} />
        ) : retentionPoints.length >= 2 ? (
          <LineChart
            points={retentionPoints}
            height={80}
            valueSuffix="%"
            showArea
          />
        ) : (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Not enough data yet — review a few cards to see your retention trend.
          </div>
        )}
      </div>

      {/* ── Section: By track ── */}
      <div>
        <SubHeading>By track</SubHeading>
        <TrackMasteryRows
          breakdown={stats?.track_breakdown ?? []}
          loading={loading}
        />
      </div>
    </div>
  );
}
