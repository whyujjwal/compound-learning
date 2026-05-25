"use client";

export function Sparkline({
  values,
  width = 240,
  height = 60,
  color = "#c89b6b",
  fill = true,
  smooth = true,
  strokeWidth = 1.5,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  smooth?: boolean;
  strokeWidth?: number;
}) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} className="sparkline">
        <text
          x={width / 2}
          y={height / 2}
          fill="rgba(255,255,255,0.3)"
          fontSize="11"
          textAnchor="middle"
          fontFamily="var(--mono)"
        >
          no data yet
        </text>
      </svg>
    );
  }

  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(1, values.length - 1)) * w;
    const y = pad + h - ((v - min) / span) * h;
    return [x, y] as const;
  });

  const linePath = smooth ? smoothPath(points) : straightPath(points);
  const areaPath = `${linePath} L${points[points.length - 1][0]},${pad + h} L${points[0][0]},${pad + h} Z`;

  const lastValue = values[values.length - 1];
  const lastX = points[points.length - 1][0];
  const lastY = points[points.length - 1][1];

  return (
    <svg width={width} height={height} className="sparkline">
      {fill && (
        <>
          <defs>
            <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#spark-${color.replace("#", "")})`} />
        </>
      )}
      <path d={linePath} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
      <title>{`Last value: ${lastValue}`}</title>
    </svg>
  );
}

function straightPath(points: ReadonlyArray<readonly [number, number]>): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
}

function smoothPath(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length < 2) return straightPath(points);
  let path = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i === 0 ? i : i - 1];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;
    path += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }
  return path;
}
