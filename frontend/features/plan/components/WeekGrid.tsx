"use client";

import Link from "next/link";
import type { WeeklySchedule, WeekdayKey } from "@/lib/api/types";
import { Skeleton } from "@/components/primitives";

/* ─── Day order ──────────────────────────────────────────── */
const DAYS: { key: WeekdayKey; short: string; label: string }[] = [
  { key: "monday",    short: "Mon", label: "Monday"    },
  { key: "tuesday",   short: "Tue", label: "Tuesday"   },
  { key: "wednesday", short: "Wed", label: "Wednesday" },
  { key: "thursday",  short: "Thu", label: "Thursday"  },
  { key: "friday",    short: "Fri", label: "Friday"    },
  { key: "saturday",  short: "Sat", label: "Saturday"  },
  { key: "sunday",    short: "Sun", label: "Sunday"    },
];

/* ─── Helpers ────────────────────────────────────────────── */
function getTodayKey(): WeekdayKey {
  const idx = new Date().getDay(); // 0=Sun … 6=Sat
  const map: WeekdayKey[] = [
    "sunday","monday","tuesday","wednesday","thursday","friday","saturday"
  ];
  return map[idx];
}

function hexOrAccent(color?: string | null): string {
  if (!color) return "var(--accent)";
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
  return "var(--accent)";
}

/* ─── Single block pill ──────────────────────────────────── */
function BlockPill({
  trackName,
  trackColor,
  minutes,
  blockNum,
}: {
  trackName: string;
  trackColor?: string | null;
  minutes?: number | null;
  blockNum: number;
}) {
  const color = hexOrAccent(trackColor);
  return (
    <Link
      href={`/block/${blockNum}`}
      style={{ textDecoration: "none" }}
      title={`Open block ${blockNum} — ${trackName}`}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 8px",
          borderRadius: 4,
          background: "var(--overlay-hover)",
          border: "1px solid var(--hairline)",
          transition: "border-color 100ms, background 100ms",
          cursor: "pointer",
          minWidth: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(35,131,226,0.35)";
          (e.currentTarget as HTMLDivElement).style.background = "var(--overlay-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--hairline)";
          (e.currentTarget as HTMLDivElement).style.background = "var(--overlay-hover)";
        }}
      >
        {/* Color dot */}
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        {/* Track name */}
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {trackName}
        </span>
        {/* Planned minutes */}
        {minutes != null && minutes > 0 && (
          <span
            style={{
              fontSize: 11,
              color: "var(--muted)",
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {minutes}m
          </span>
        )}
      </div>
    </Link>
  );
}

/* ─── Today's highlight block summary ────────────────────── */
function TodayBlocks({
  todayBlocks,
  schedule,
  todayKey,
}: {
  todayBlocks: { block: number; track: string; track_name: string | null }[];
  schedule: WeeklySchedule | undefined;
  todayKey: WeekdayKey;
}) {
  if (todayBlocks.length === 0) return null;

  // Enrich with minutes from the weekly schedule if available
  const daySchedule = schedule?.[todayKey] ?? [];

  return (
    <section aria-label="Today's blocks" style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 8,
        }}
      >
        Today
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {todayBlocks.map((tb) => {
          const scheduled = daySchedule.find((s) => s.block === tb.block);
          return (
            <BlockPill
              key={tb.block}
              trackName={tb.track_name ?? tb.track}
              trackColor={scheduled ? undefined : undefined}
              minutes={scheduled?.minutes ?? null}
              blockNum={tb.block}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ─── Single day column ──────────────────────────────────── */
function DayColumn({
  dayInfo,
  blocks,
  isToday,
}: {
  dayInfo: typeof DAYS[number];
  blocks: import("@/lib/api/types").ScheduleBlock[];
  isToday: boolean;
}) {
  return (
    <div
      style={{
        flex: "1 1 120px",
        minWidth: 120,
        borderRadius: 6,
        border: isToday
          ? "1.5px solid rgba(35,131,226,0.35)"
          : "1px solid var(--hairline)",
        background: isToday ? "rgba(35,131,226,0.03)" : "var(--canvas)",
        overflow: "hidden",
      }}
    >
      {/* Day header */}
      <div
        style={{
          padding: "8px 10px 6px",
          borderBottom: "1px solid var(--hairline)",
          background: isToday ? "rgba(35,131,226,0.06)" : "var(--panel)",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: isToday ? 700 : 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: isToday ? "var(--accent)" : "var(--muted)",
          }}
        >
          {dayInfo.short}
          {isToday && (
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--accent)",
                marginLeft: 5,
                verticalAlign: "middle",
              }}
              aria-label="Today"
            />
          )}
        </p>
      </div>

      {/* Block list */}
      <div style={{ padding: "8px 8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {blocks.length === 0 ? (
          <p
            style={{
              fontSize: 11,
              color: "var(--muted)",
              padding: "6px 2px",
              lineHeight: 1.5,
            }}
          >
            Rest
          </p>
        ) : (
          blocks.map((b) => (
            <BlockPill
              key={b.block}
              trackName={b.track_name ?? b.track}
              trackColor={null}
              minutes={b.minutes}
              blockNum={b.block}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Week grid skeleton ─────────────────────────────────── */
export function WeekGridSkeleton() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 4 }}>
      {DAYS.map((d) => (
        <div
          key={d.key}
          style={{
            flex: "1 1 120px",
            minWidth: 120,
            borderRadius: 6,
            border: "1px solid var(--hairline)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 10px 6px", background: "var(--panel)", borderBottom: "1px solid var(--hairline)" }}>
            <Skeleton height={10} width={28} borderRadius={3} />
          </div>
          <div style={{ padding: "8px 8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            <Skeleton height={26} borderRadius={4} />
            {d.key === "monday" || d.key === "wednesday" ? <Skeleton height={26} borderRadius={4} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main week grid ─────────────────────────────────────── */
interface WeekGridProps {
  schedule: WeeklySchedule;
  todayBlocks?: { block: number; track: string; track_name: string | null }[];
  isLoading?: boolean;
}

export function WeekGrid({ schedule, todayBlocks = [], isLoading = false }: WeekGridProps) {
  const todayKey = getTodayKey();

  if (isLoading) {
    return <WeekGridSkeleton />;
  }

  return (
    <>
      {/* Today's quick blocks if present */}
      {todayBlocks.length > 0 && (
        <TodayBlocks
          todayBlocks={todayBlocks}
          schedule={schedule}
          todayKey={todayKey}
        />
      )}

      {/* 7-day calendar grid */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "nowrap",
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {DAYS.map((d) => (
          <DayColumn
            key={d.key}
            dayInfo={d}
            blocks={schedule[d.key] ?? []}
            isToday={d.key === todayKey}
          />
        ))}
      </div>
    </>
  );
}
