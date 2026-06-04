"use client";

import type { Stats } from "@/lib/api/types";
import { Skeleton } from "@/components/primitives";
import Link from "next/link";
import { GoalRing } from "./GoalRing";

interface TodayStatsProps {
  stats: Stats | undefined;
  /** queue prop kept for API compat — not used in this redesign */
  queue?: unknown;
  statsLoading: boolean;
  /** queueLoading kept for API compat */
  queueLoading?: boolean;
}

/* ── Flame icon ─────────────────────────────────────────────── */
function FlameIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d="M7 1.5C7 1.5 9.5 4 9.5 6.5C9.5 7.88 8.38 9 7 9C5.62 9 4.5 7.88 4.5 6.5C4.5 5.5 5 4.5 5 4.5C5 4.5 4 5.5 4 6.5C4 8.43 5.57 10 7 10C8.43 10 10 8.43 10 6.5C10 3.5 7 1.5 7 1.5Z"
        fill={active ? "var(--warn)" : "var(--muted)"}
      />
    </svg>
  );
}

/* ── Hairline divider ───────────────────────────────────────── */
function Divider() {
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        alignSelf: "stretch",
        background: "var(--hairline)",
        flexShrink: 0,
        minHeight: 36,
      }}
    />
  );
}

/* ── Individual stat cell ───────────────────────────────────── */
interface StatCellProps {
  value: React.ReactNode;
  label: string;
  accent?: boolean;
  ok?: boolean;
  warn?: boolean;
}

function StatCell({ value, label, accent, ok, warn }: StatCellProps) {
  const color = ok
    ? "var(--ok)"
    : warn
    ? "var(--warn)"
    : accent
    ? "var(--accent)"
    : "var(--text)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        minWidth: 0,
        padding: "0 4px",
      }}
    >
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "var(--muted)",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── Minutes cell (with GoalRing) ──────────────────────────── */
function MinutesCell({
  minutesToday,
  goalMinutes,
}: {
  minutesToday: number;
  goalMinutes: number;
}) {
  const goalMet = goalMinutes > 0 && minutesToday >= goalMinutes;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 4px",
      }}
    >
      <GoalRing minutesToday={minutesToday} goalMinutes={goalMinutes} size={56} />
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: goalMet ? "var(--ok)" : "var(--text)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {minutesToday}
          {goalMinutes > 0 && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "var(--muted)",
                letterSpacing: 0,
              }}
            >
              /{goalMinutes}
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--muted)",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          min today
        </span>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export function TodayStats({ stats, statsLoading }: TodayStatsProps) {
  if (statsLoading) {
    return (
      <div
        style={{
          display: "flex",
          gap: 0,
          alignItems: "center",
          paddingBottom: 20,
          borderBottom: "1px solid var(--hairline)",
          marginBottom: 32,
          overflowX: "auto",
        }}
      >
        {[72, 1, 64, 1, 88, 1, 60, 1, 58, 1, 64].map((w, i) =>
          w === 1 ? (
            <div
              key={i}
              style={{
                width: 1,
                height: 36,
                background: "var(--hairline)",
                flexShrink: 0,
                margin: "0 16px",
              }}
            />
          ) : (
            <Skeleton key={i} width={w} height={36} borderRadius={4} />
          )
        )}
        <div style={{ marginLeft: "auto", paddingLeft: 16 }}>
          <Skeleton width={80} height={14} />
        </div>
      </div>
    );
  }

  const streak = stats?.current_streak ?? 0;
  const reviewsToday = stats?.reviews_today ?? 0;
  const minutesToday = stats?.minutes_today ?? 0;
  const goalMinutes = stats?.daily_goal_minutes ?? 0;
  const retention = stats ? Math.round((stats.retention_rate ?? 0) * 100) : 0;
  const dueCards = stats?.due_cards ?? 0;
  const mastered = stats?.materials_mastered ?? 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        paddingBottom: 20,
        borderBottom: "1px solid var(--hairline)",
        marginBottom: 32,
        overflowX: "auto",
      }}
    >
      {/* Streak */}
      <StatCell
        value={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {streak}
            <FlameIcon active={streak > 0} />
          </span>
        }
        label="Streak"
        warn={streak > 0}
      />

      <div style={{ margin: "0 16px" }}>
        <Divider />
      </div>

      {/* Reviews today */}
      <StatCell value={reviewsToday} label="Reviews" />

      <div style={{ margin: "0 16px" }}>
        <Divider />
      </div>

      {/* Minutes today + GoalRing */}
      <MinutesCell minutesToday={minutesToday} goalMinutes={goalMinutes} />

      <div style={{ margin: "0 16px" }}>
        <Divider />
      </div>

      {/* Retention */}
      <StatCell
        value={`${retention}%`}
        label="Retention"
        ok={retention >= 80}
      />

      <div style={{ margin: "0 16px" }}>
        <Divider />
      </div>

      {/* Due cards */}
      <StatCell
        value={dueCards}
        label="Due cards"
        accent={dueCards > 0}
      />

      <div style={{ margin: "0 16px" }}>
        <Divider />
      </div>

      {/* Mastered */}
      <StatCell value={mastered} label="Mastered" ok={mastered > 0} />

      {/* View profile link */}
      <div style={{ marginLeft: "auto", paddingLeft: 16, flexShrink: 0 }}>
        <Link
          href="/profile"
          style={{
            fontSize: 13,
            color: "var(--muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 0",
            transition: "color var(--dur-fast)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)";
          }}
        >
          View profile
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
