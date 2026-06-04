"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Types ──────────────────────────────────────────────────── */
export interface ContributionGraphProps {
  data: { date: string; count: number }[];
  weeks?: number;
  colorScheme?: "accent" | "green";
  cellSize?: number;
  gap?: number;
  showFooter?: boolean;
}

interface DayCell {
  date: string; // "YYYY-MM-DD"
  count: number;
  isToday: boolean;
  isFuture: boolean;
}

/* ─── Streak helpers ─────────────────────────────────────────── */
export function computeStreaks(data: { date: string; count: number }[]): {
  currentStreak: number;
  longestStreak: number;
  totalCount: number;
} {
  if (!data.length) return { currentStreak: 0, longestStreak: 0, totalCount: 0 };

  const totalCount = data.reduce((s, d) => s + d.count, 0);

  // Build a set of active dates
  const activeSet = new Set<string>();
  for (const d of data) {
    if (d.count > 0) activeSet.add(d.date);
  }

  // Sort dates ascending
  const sorted = [...activeSet].sort();

  if (!sorted.length) return { currentStreak: 0, longestStreak: 0, totalCount };

  // Longest streak
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: walk backwards from today (allow yesterday tolerance)
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  let current = 0;
  // Start anchor: today or yesterday
  const anchor = activeSet.has(todayStr)
    ? todayStr
    : activeSet.has(yesterdayStr)
    ? yesterdayStr
    : null;

  if (anchor) {
    let cursor = new Date(anchor);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (activeSet.has(key)) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return { currentStreak: current, longestStreak: longest, totalCount };
}

/* ─── Intensity levels ───────────────────────────────────────── */
function getIntensityLevel(count: number, thresholds: [number, number, number, number]): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count < thresholds[1]) return 1;
  if (count < thresholds[2]) return 2;
  if (count < thresholds[3]) return 3;
  return 4;
}

function computeThresholds(data: { date: string; count: number }[]): [number, number, number, number] {
  const nonZero = data.map((d) => d.count).filter((c) => c > 0).sort((a, b) => a - b);
  if (nonZero.length < 4) {
    // Fallback fixed thresholds
    return [1, 3, 6, 10];
  }
  const q = (p: number) => nonZero[Math.floor(p * (nonZero.length - 1))];
  return [1, q(0.25), q(0.5), q(0.75)];
}

/* ─── Cell colors ────────────────────────────────────────────── */
const ACCENT_LEVELS = [
  "var(--overlay-hover)",             // level 0
  "rgba(35,131,226,0.25)",            // level 1
  "rgba(35,131,226,0.45)",            // level 2
  "rgba(35,131,226,0.70)",            // level 3
  "rgba(35,131,226,1.00)",            // level 4
];

// Green scheme: derive from --ok which is teal-green in light (#0f7b6c) and bright green in dark (#3dd68c)
// We use a static green palette that reads well on both themes
const GREEN_LEVELS = [
  "var(--overlay-hover)",
  "rgba(15,123,108,0.22)",
  "rgba(15,123,108,0.45)",
  "rgba(15,123,108,0.72)",
  "var(--ok)",
];

function getLevelColor(level: 0 | 1 | 2 | 3 | 4, scheme: "accent" | "green"): string {
  return scheme === "green" ? GREEN_LEVELS[level] : ACCENT_LEVELS[level];
}

/* ─── Date helpers ───────────────────────────────────────────── */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WEEKDAY_LABELS: { row: number; label: string }[] = [
  { row: 1, label: "Mon" },
  { row: 3, label: "Wed" },
  { row: 5, label: "Fri" },
];

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${WEEKDAYS_FULL[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ─── Floating tooltip ───────────────────────────────────────── */
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

/* ─── Component ─────────────────────────────────────────────── */
export function ContributionGraph({
  data,
  weeks = 53,
  colorScheme = "accent",
  cellSize = 11,
  gap = 3,
  showFooter = true,
}: ContributionGraphProps) {
  const step = cellSize + gap;
  const wrapRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, content: "",
  });

  /* Build the grid */
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);

  const countMap = new Map<string, number>();
  for (const d of data) countMap.set(d.date, d.count);

  const thresholds = computeThresholds(data);

  // Last day = today; first col's Sunday = today - (weeks*7 - 1) days, then back to Sunday
  // We want exactly `weeks` columns. The last column ends on the Saturday >= today.
  // Build from today backward: column index = weeks-1 is the rightmost.
  // Column day 0 = Sunday

  // Align: compute the day-of-week of today (0=Sun)
  const todayDow = todayDate.getDay(); // 0–6
  // The last column contains today at row `todayDow`.
  // Total cells = weeks * 7
  // The "start" date (top-left cell) is weeks*7 - 1 - todayDow days before today, plus go back to the Sunday of that week
  const totalDays = weeks * 7;
  const startDate = new Date(todayDate);
  startDate.setDate(startDate.getDate() - (totalDays - 1 - (6 - todayDow)));
  // Go back to Sunday of that week? Actually: the start of the grid is the Sunday of the column that starts exactly `weeks` columns ago.
  // Simpler: grid[col][row] = startDate + col*7 + row
  // where startDate is the Sunday that is `weeks` weeks back from the Sunday of the current column.
  // The current column (rightmost) has Sunday = today - todayDow.
  const rightColSunday = new Date(todayDate);
  rightColSunday.setDate(rightColSunday.getDate() - todayDow);
  const gridStart = new Date(rightColSunday);
  gridStart.setDate(gridStart.getDate() - (weeks - 1) * 7);

  // Build columns
  const columns: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      const key = date.toISOString().slice(0, 10);
      col.push({
        date: key,
        count: countMap.get(key) ?? 0,
        isToday: key === todayStr,
        isFuture: date > todayDate,
      });
    }
    columns.push(col);
  }

  /* Month labels: find column where month first appears */
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < columns.length; w++) {
    const firstDay = new Date(columns[w][0].date + "T00:00:00");
    const m = firstDay.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: w, label: MONTHS[m] });
      lastMonth = m;
    }
  }

  /* SVG dimensions */
  const MONTH_LABEL_H = 16;
  const WEEKDAY_LABEL_W = 28;
  const svgWidth = WEEKDAY_LABEL_W + weeks * step - gap;
  const svgHeight = MONTH_LABEL_H + 7 * step - gap;

  /* Tooltip handlers */
  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGRectElement>, cell: DayCell) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const cellRect = (e.target as SVGRectElement).getBoundingClientRect();
    const x = cellRect.left - rect.left + cellSize / 2;
    const y = cellRect.top - rect.top;
    const content = cell.count === 0
      ? `No activity · ${formatTooltipDate(cell.date)}`
      : `${cell.count} review${cell.count !== 1 ? "s" : ""} · ${formatTooltipDate(cell.date)}`;
    setTooltip({ visible: true, x, y, content });
  }, [cellSize]);

  const handleMouseLeave = useCallback(() => {
    setTooltip((t) => ({ ...t, visible: false }));
  }, []);

  /* Streaks + total for footer */
  const { currentStreak, longestStreak, totalCount } = computeStreaks(data);

  /* Footer legend swatches */
  const legendColors = [0, 1, 2, 3, 4].map((l) =>
    getLevelColor(l as 0 | 1 | 2 | 3 | 4, colorScheme)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Horizontal scroll wrapper */}
      <div ref={wrapRef} style={{ overflowX: "auto", position: "relative", maxWidth: "100%" }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          aria-label="Contribution activity graph"
          style={{ display: "block", overflow: "visible" }}
        >
          {/* Month labels */}
          {monthLabels.map(({ col, label }) => (
            <text
              key={`m-${col}`}
              x={WEEKDAY_LABEL_W + col * step}
              y={MONTH_LABEL_H - 4}
              fontSize={10}
              fill="var(--muted)"
              fontFamily="inherit"
            >
              {label}
            </text>
          ))}

          {/* Weekday labels */}
          {WEEKDAY_LABELS.map(({ row, label }) => (
            <text
              key={`wd-${row}`}
              x={0}
              y={MONTH_LABEL_H + row * step + cellSize - 1}
              fontSize={10}
              fill="var(--muted)"
              fontFamily="inherit"
            >
              {label}
            </text>
          ))}

          {/* Cells */}
          {columns.map((col, wi) =>
            col.map((cell, di) => {
              const level = getIntensityLevel(cell.count, thresholds);
              const fill = cell.isFuture
                ? "transparent"
                : getLevelColor(level, colorScheme);
              const cx = WEEKDAY_LABEL_W + wi * step;
              const cy = MONTH_LABEL_H + di * step;

              return (
                <rect
                  key={`${wi}-${di}`}
                  x={cx}
                  y={cy}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={fill}
                  stroke={cell.isToday ? "var(--accent)" : "none"}
                  strokeWidth={cell.isToday ? 1 : 0}
                  aria-label={
                    cell.count === 0
                      ? `No activity on ${cell.date}`
                      : `${cell.count} review${cell.count !== 1 ? "s" : ""} on ${cell.date}`
                  }
                  style={{ cursor: cell.isFuture ? "default" : "pointer" }}
                  onMouseEnter={(e) => !cell.isFuture && handleMouseEnter(e, cell)}
                  onMouseLeave={handleMouseLeave}
                >
                  <title>
                    {cell.count === 0
                      ? `No activity · ${cell.date}`
                      : `${cell.count} review${cell.count !== 1 ? "s" : ""} · ${cell.date}`}
                  </title>
                </rect>
              );
            })
          )}
        </svg>

        {/* Floating tooltip */}
        {tooltip.visible && (
          <div
            role="tooltip"
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: "translate(-50%, -100%)",
              background: "var(--text)",
              color: "var(--canvas)",
              fontSize: 11,
              fontWeight: 400,
              padding: "4px 8px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 600,
              lineHeight: 1.4,
              boxShadow: "var(--shadow-float)",
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>

      {/* Footer */}
      {showFooter && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Less</span>
            {legendColors.map((color, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 2,
                  background: color,
                  border: "1px solid var(--hairline)",
                  flexShrink: 0,
                }}
              />
            ))}
            <span style={{ fontSize: 11, color: "var(--muted)" }}>More</span>
          </div>

          {/* Summary */}
          <span style={{ fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            {totalCount.toLocaleString()} reviews in the last year
            {currentStreak > 0 && ` · ${currentStreak}-day streak`}
            {longestStreak > 0 && ` · longest ${longestStreak}`}
          </span>
        </div>
      )}
    </div>
  );
}
