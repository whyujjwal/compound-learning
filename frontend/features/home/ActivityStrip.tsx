"use client";

import { useActivity } from "@/lib/hooks";
import { Skeleton } from "@/components/primitives";

const DAYS_TO_SHOW = 91; // ~13 weeks
const WEEKS = 13;
const CELL_SIZE = 11;
const CELL_GAP = 2;
const DAY_LABELS = ["M", "", "W", "", "F", "", ""];

function getIntensity(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  return Math.min(1, Math.sqrt(count / max));
}

function cellColor(intensity: number, isToday: boolean): string {
  if (isToday && intensity === 0) return "var(--accent-soft)";
  if (intensity === 0) return "var(--overlay-hover)";
  // blend from accent-soft to accent based on intensity
  const alpha = 0.15 + intensity * 0.85;
  return `rgba(35, 131, 226, ${alpha.toFixed(2)})`;
}

export function ActivityStrip() {
  const { data: activity, isLoading } = useActivity(DAYS_TO_SHOW);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "16px 0",
          borderTop: "1px solid var(--hairline)",
          marginTop: 32,
        }}
      >
        <Skeleton width={160} height={68} borderRadius={4} />
      </div>
    );
  }

  if (!activity || activity.length === 0) return null;

  // Build a map of date → count
  const countMap = new Map<string, number>();
  for (const { date, count } of activity) {
    countMap.set(date, count);
  }
  const max = Math.max(...Array.from(countMap.values()), 1);

  // Build grid: each column is a week (Mon–Sun)
  // Align to the most recent complete day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // We'll build WEEKS * 7 cells, working backwards from today
  const cells: { date: string; count: number; isToday: boolean }[] = [];
  const todayStr = today.toISOString().slice(0, 10);

  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    cells.push({
      date: ds,
      count: countMap.get(ds) ?? 0,
      isToday: ds === todayStr,
    });
  }

  // Group by week
  const weeks: (typeof cells)[] = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  // Month labels: find first cell per month
  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = new Date(weeks[w][0].date);
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        week: w,
        label: firstDay.toLocaleDateString("en-US", { month: "short" }),
      });
      lastMonth = month;
    }
  }

  const gridWidth = WEEKS * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  return (
    <div
      style={{
        paddingTop: 24,
        borderTop: "1px solid var(--hairline)",
        marginTop: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        {/* Day labels on the left */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: CELL_GAP,
            paddingTop: 18, // offset for month row
            flexShrink: 0,
          }}
        >
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: CELL_SIZE,
                fontSize: 10,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ overflow: "hidden", minWidth: 0 }}>
          {/* Month labels */}
          <div
            style={{
              display: "flex",
              marginBottom: 4,
              position: "relative",
              height: 14,
              width: gridWidth,
            }}
          >
            {monthLabels.map(({ week, label }) => (
              <span
                key={label + week}
                style={{
                  position: "absolute",
                  left: week * (CELL_SIZE + CELL_GAP),
                  fontSize: 10,
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Cells */}
          <div
            style={{
              display: "flex",
              gap: CELL_GAP,
            }}
          >
            {weeks.map((week, wi) => (
              <div
                key={wi}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: CELL_GAP,
                }}
              >
                {week.map((cell) => {
                  const intensity = getIntensity(cell.count, max);
                  return (
                    <div
                      key={cell.date}
                      title={`${cell.date}: ${cell.count} review${cell.count !== 1 ? "s" : ""}`}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        borderRadius: 2,
                        background: cellColor(intensity, cell.isToday),
                        outline: cell.isToday ? "1.5px solid var(--accent)" : "none",
                        outlineOffset: -1,
                        flexShrink: 0,
                        transition: "background var(--dur-fast)",
                        cursor: "default",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 10,
          paddingLeft: 30,
        }}
      >
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <div
            key={v}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              borderRadius: 2,
              background: v === 0 ? "var(--overlay-hover)" : cellColor(v, false),
            }}
          />
        ))}
        <span style={{ fontSize: 11, color: "var(--muted)" }}>More</span>
      </div>
    </div>
  );
}
