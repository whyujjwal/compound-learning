"use client";

type Cell = { date: string; count: number };

export function Heatmap({
  data,
  weeks = 16,
  color = "#c89b6b",
  emptyColor = "rgba(255,255,255,0.04)",
  size = 11,
  gap = 3,
}: {
  data: Cell[];
  weeks?: number;
  color?: string;
  emptyColor?: string;
  size?: number;
  gap?: number;
}) {
  if (data.length === 0) return null;

  const slice = data.slice(-weeks * 7);
  const padded: Cell[] = [];
  const firstDate = new Date(slice[0].date);
  const dow = firstDate.getDay();
  for (let i = 0; i < dow; i++) padded.push({ date: "", count: 0 });
  padded.push(...slice);

  const max = Math.max(1, ...padded.map((c) => c.count));

  function intensityColor(count: number) {
    if (!count) return emptyColor;
    const t = Math.min(1, 0.25 + (count / max) * 0.75);
    return colorWithAlpha(color, t);
  }

  const cellPitch = size + gap;
  const width = Math.ceil(padded.length / 7) * cellPitch;
  const height = 7 * cellPitch;

  return (
    <svg width={width} height={height} className="heatmap" aria-label="Activity heatmap">
      {padded.map((cell, i) => {
        const col = Math.floor(i / 7);
        const row = i % 7;
        if (!cell.date) return null;
        return (
          <rect
            key={i}
            x={col * cellPitch}
            y={row * cellPitch}
            width={size}
            height={size}
            rx={2}
            fill={intensityColor(cell.count)}
          >
            <title>{`${cell.date}: ${cell.count} review${cell.count === 1 ? "" : "s"}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

function colorWithAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}
