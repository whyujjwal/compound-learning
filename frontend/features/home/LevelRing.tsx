"use client";

interface LevelRingProps {
  level: number;
  xpInto: number;
  xpSpan: number;
  /** Diameter in px (default 56) */
  size?: number;
}

/**
 * SVG progress ring for the learner's level. The arc fills with progress toward
 * the next level; the level number sits in the center. Accent stroke on a
 * --hairline track. Mirrors GoalRing so the Today strip stays visually coherent.
 */
export function LevelRing({ level, xpInto, xpSpan, size = 56 }: LevelRingProps) {
  const span = xpSpan > 0 ? xpSpan : 1;
  const pct = Math.max(0, Math.min(1, xpInto / span));

  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      role="img"
      aria-label={`Level ${level}, ${xpInto} of ${xpSpan} XP to next level`}
      style={{ width: size, height: size, flexShrink: 0, position: "relative" }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={radius} stroke="var(--hairline)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.5s var(--ease-out, ease)" }}
        />
      </svg>

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: size <= 48 ? 8 : 9,
            fontWeight: 600,
            color: "var(--muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          Lv
        </span>
        <span
          style={{
            fontSize: size <= 48 ? 16 : 18,
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
          }}
        >
          {level}
        </span>
      </div>
    </div>
  );
}
