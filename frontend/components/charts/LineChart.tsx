"use client";

import { useState, useRef, useCallback, useId } from "react";

export interface LineChartPoint {
  label: string;
  value: number;
}

export interface LineChartProps {
  points: LineChartPoint[];
  height?: number;
  color?: string;
  valueSuffix?: string;
  showArea?: boolean;
}

interface HoverDot {
  visible: boolean;
  x: number;
  y: number;
  svgX: number;
  svgY: number;
  label: string;
  value: number;
}

export function LineChart({
  points,
  height = 80,
  color = "var(--accent)",
  valueSuffix = "",
  showArea = true,
}: LineChartProps) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);

  const [hover, setHover] = useState<HoverDot>({
    visible: false, x: 0, y: 0, svgX: 0, svgY: 0, label: "", value: 0,
  });

  if (!points.length) {
    return (
      <div style={{ height, display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Not enough data</span>
      </div>
    );
  }

  const PAD_LEFT = 4;
  const PAD_RIGHT = 4;
  const PAD_TOP = 8;
  const PAD_BOTTOM = 4;

  // We use a full-width responsive SVG with viewBox
  const VW = 400; // virtual width for coordinate math
  const VH = height;

  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const toX = (i: number) =>
    PAD_LEFT + (i / Math.max(points.length - 1, 1)) * (VW - PAD_LEFT - PAD_RIGHT);
  const toY = (v: number) =>
    PAD_TOP + (1 - (v - minV) / range) * (VH - PAD_TOP - PAD_BOTTOM);

  const coords = points.map((p, i) => ({ x: toX(i), y: toY(p.value) }));

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

  const areaPath =
    coords.length > 1
      ? `M${coords[0].x},${coords[0].y} ` +
        coords.slice(1).map((c) => `L${c.x},${c.y}`).join(" ") +
        ` L${coords[coords.length - 1].x},${VH - PAD_BOTTOM}` +
        ` L${coords[0].x},${VH - PAD_BOTTOM} Z`
      : "";

  // Min/max gridlines
  const minY = toY(minV);
  const maxY = toY(maxV);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * VW;
    // Find nearest point
    let nearest = 0;
    let nearestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - mouseX);
      if (dist < nearestDist) { nearestDist = dist; nearest = i; }
    });
    const pt = points[nearest];
    const c = coords[nearest];
    setHover({
      visible: true,
      x: (c.x / VW) * rect.width + rect.left - rect.left,
      y: (c.y / VH) * rect.height,
      svgX: c.x,
      svgY: c.y,
      label: pt.label,
      value: pt.value,
    });
  }, [coords, points]);

  const handleMouseLeave = useCallback(() => {
    setHover((h) => ({ ...h, visible: false }));
  }, []);

  // First and last labels
  const firstLabel = points[0]?.label ?? "";
  const lastLabel = points[points.length - 1]?.label ?? "";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        aria-label="Line chart"
        style={{ display: "block", overflow: "visible" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={`lc-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Gridlines at min and max */}
        {range > 0 && (
          <>
            <line
              x1={PAD_LEFT} y1={maxY} x2={VW - PAD_RIGHT} y2={maxY}
              stroke="var(--hairline)" strokeWidth="1" strokeDasharray="3 3"
            />
            <line
              x1={PAD_LEFT} y1={minY} x2={VW - PAD_RIGHT} y2={minY}
              stroke="var(--hairline)" strokeWidth="1" strokeDasharray="3 3"
            />
          </>
        )}

        {/* Area */}
        {showArea && areaPath && (
          <path d={areaPath} fill={`url(#lc-fill-${uid})`} />
        )}

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hover dot */}
        {hover.visible && (
          <>
            <line
              x1={hover.svgX} y1={PAD_TOP} x2={hover.svgX} y2={VH - PAD_BOTTOM}
              stroke="var(--hairline)" strokeWidth="1"
            />
            <circle
              cx={hover.svgX} cy={hover.svgY} r={3.5}
              fill={color} stroke="var(--canvas)" strokeWidth="2"
            />
          </>
        )}
      </svg>

      {/* First/last x-axis labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--muted)" }}>{firstLabel}</span>
        <span style={{ fontSize: 10, color: "var(--muted)" }}>{lastLabel}</span>
      </div>

      {/* Tooltip */}
      {hover.visible && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            left: `${(hover.svgX / VW) * 100}%`,
            top: hover.y - 12,
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
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {hover.label} · {hover.value.toLocaleString()}{valueSuffix}
        </div>
      )}
    </div>
  );
}
