"use client";

import type { Stats, DailyQueue } from "@/lib/api/types";
import { Skeleton } from "@/components/primitives";
import Link from "next/link";

interface TodayStatsProps {
  stats: Stats | undefined;
  queue: DailyQueue | undefined;
  statsLoading: boolean;
  queueLoading: boolean;
}

function StatCell({
  value,
  label,
  muted,
  accent,
}: {
  value: React.ReactNode;
  label: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: accent ? "var(--accent)" : muted ? "var(--muted)" : "var(--text)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "var(--muted)",
          fontWeight: 400,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function StatDivider() {
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        height: 28,
        background: "var(--hairline)",
        flexShrink: 0,
        alignSelf: "center",
      }}
    />
  );
}

export function TodayStats({ stats, queue, statsLoading, queueLoading }: TodayStatsProps) {
  const streak = stats?.current_streak ?? 0;
  const due = stats?.due_cards ?? 0;
  const reviewsToday = stats?.reviews_today ?? 0;
  const retention = stats ? Math.round((stats.retention_rate || 0) * 100) : null;

  const totalItems = queue ? queue.review_count + queue.new_count : 0;
  const totalMins = queue?.total_minutes ?? 0;

  if (statsLoading || queueLoading) {
    return (
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
          paddingBottom: 20,
          borderBottom: "1px solid var(--hairline)",
          marginBottom: 32,
        }}
      >
        {[70, 56, 60, 50, 64].map((w, i) => (
          <Skeleton key={i} width={w} height={36} />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "center",
        paddingBottom: 20,
        borderBottom: "1px solid var(--hairline)",
        marginBottom: 32,
        flexWrap: "wrap",
      }}
    >
      <StatCell
        value={
          <span style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            {streak}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
              style={{ marginLeft: 2, marginBottom: 1, verticalAlign: "middle" }}
            >
              <path
                d="M7 1.5C7 1.5 9.5 4 9.5 6.5C9.5 7.88 8.38 9 7 9C5.62 9 4.5 7.88 4.5 6.5C4.5 5.5 5 4.5 5 4.5C5 4.5 4 5.5 4 6.5C4 8.43 5.57 10 7 10C8.43 10 10 8.43 10 6.5C10 3.5 7 1.5 7 1.5Z"
                fill={streak > 0 ? "var(--warn)" : "var(--muted)"}
              />
            </svg>
          </span>
        }
        label="day streak"
        accent={streak > 0}
      />

      <StatDivider />

      <StatCell
        value={totalItems}
        label="items today"
      />

      <StatDivider />

      <StatCell
        value={due}
        label="due cards"
        accent={due > 0}
      />

      {reviewsToday > 0 && (
        <>
          <StatDivider />
          <StatCell value={reviewsToday} label="reviewed" />
        </>
      )}

      {retention !== null && (
        <>
          <StatDivider />
          <StatCell
            value={`${retention}%`}
            label="retention"
            muted={retention > 80}
          />
        </>
      )}

      {totalMins > 0 && (
        <>
          <StatDivider />
          <StatCell value={`~${totalMins}m`} label="est. time" />
        </>
      )}

      <div style={{ marginLeft: "auto" }}>
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
