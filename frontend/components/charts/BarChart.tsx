"use client";

import { useState, useCallback } from "react";

export interface BarChartBar {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  bars: BarChartBar[];
  height?: number;
  valueSuffix?: string;
}

interface HoverState {
  visible: boolean;
  barIndex: number;
  x: number; // percent of container
  label: string;
  value: number;
}

export function BarChart({ bars, height = 80, valueSuffix = "" }: BarChartProps) {
  const [hover, setHover] = useState<HoverState>({
    visible: false, barIndex: -1, x: 0, label: "", value: 0,
  });

  if (!bars.length) {
    return (
      <div style={{ height, display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>No data</span>
      </div>
    );
  }

  const maxV = Math.max(...bars.map((b) => b.value), 1);

  const PAD_BOTTOM = 18; // space for labels
  const chartH = height - PAD_BOTTOM;

  const barW = `calc(${100 / bars.length}% - 3px)`;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Bar area */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          height: chartH,
          position: "relative",
        }}
      >
        {bars.map((bar, i) => {
          const pct = (bar.value / maxV) * 100;
          const isHovered = hover.visible && hover.barIndex === i;
          const color = bar.color ?? "var(--accent)";
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(pct, bar.value > 0 ? 2 : 0)}%`,
                background: isHovered ? (bar.color ?? "var(--accent-hover)") : color,
                borderRadius: "2px 2px 0 0",
                opacity: hover.visible && !isHovered ? 0.6 : 1,
                transition: "opacity 100ms, background 100ms",
                cursor: "pointer",
                minWidth: 2,
              }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                const barRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const x = ((barRect.left + barRect.width / 2 - rect.left) / rect.width) * 100;
                setHover({ visible: true, barIndex: i, x, label: bar.label, value: bar.value });
              }}
              onMouseLeave={() => setHover((h) => ({ ...h, visible: false }))}
            />
          );
        })}
      </div>

      {/* X-axis labels — show first and last only to avoid clutter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--muted)" }}>{bars[0]?.label ?? ""}</span>
        <span style={{ fontSize: 10, color: "var(--muted)" }}>{bars[bars.length - 1]?.label ?? ""}</span>
      </div>

      {/* Tooltip */}
      {hover.visible && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            left: `${hover.x}%`,
            top: 0,
            transform: "translate(-50%, -110%)",
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
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {hover.label} · {hover.value.toLocaleString()}{valueSuffix}
        </div>
      )}
    </div>
  );
}
