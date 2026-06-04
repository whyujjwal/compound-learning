"use client";

interface GoalRingProps {
  minutesToday: number;
  goalMinutes: number;
  /** Diameter in px (default 64) */
  size?: number;
}

/**
 * SVG progress ring: minutes_today / daily_goal_minutes.
 * Accent stroke on a --hairline track; turns --ok when goal met.
 */
export function GoalRing({ minutesToday, goalMinutes, size = 64 }: GoalRingProps) {
  const goal = goalMinutes > 0 ? goalMinutes : 1;
  const pct = Math.min(1, minutesToday / goal);
  const goalMet = pct >= 1;

  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const cx = size / 2;
  const cy = size / 2;

  const trackColor = "var(--hairline)";
  const progressColor = goalMet ? "var(--ok)" : "var(--accent)";

  const pctLabel = Math.round(pct * 100);
  const centerLabel =
    goalMinutes > 0
      ? `${minutesToday}/${goalMinutes}m`
      : `${minutesToday}m`;

  return (
    <div
      role="img"
      aria-label={`Goal ring: ${minutesToday} of ${goalMinutes} minutes studied today (${pctLabel}%)`}
      style={{ width: size, height: size, flexShrink: 0, position: "relative" }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        style={{ display: "block" }}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={progressColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.3s ease" }}
        />
      </svg>

      {/* Center label */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: size <= 56 ? 9 : 10,
            fontWeight: 600,
            color: goalMet ? "var(--ok)" : "var(--text)",
            letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {centerLabel}
        </span>
      </div>
    </div>
  );
}
