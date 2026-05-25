"use client";

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 6,
  color = "#a78bfa",
  trackColor = "rgba(255,255,255,0.08)",
  label,
  sublabel,
}: {
  value: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * clamped;

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 600ms cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="progress-ring-text">
        {label !== undefined && <div className="progress-ring-label">{label}</div>}
        {sublabel !== undefined && <div className="progress-ring-sub">{sublabel}</div>}
      </div>
    </div>
  );
}
