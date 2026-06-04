/**
 * Small circular progress ring — Notion-style, restrained.
 * Shows percentage of mastered items.
 */
export function ProgressRing({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const radius = 9;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <span
      role="img"
      aria-label={`${pct}% mastered`}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        {/* Track */}
        <circle
          cx="11" cy="11" r={radius}
          stroke="var(--hairline)"
          strokeWidth="2"
          fill="none"
        />
        {/* Progress */}
        {pct > 0 && (
          <circle
            cx="11" cy="11" r={radius}
            stroke={pct === 100 ? "var(--ok)" : "var(--accent)"}
            strokeWidth="2"
            fill="none"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 11 11)"
          />
        )}
      </svg>
      <span style={{
        fontSize: 12,
        color: pct === 100 ? "var(--ok)" : "var(--muted)",
        fontVariantNumeric: "tabular-nums",
        minWidth: 28,
      }}>
        {pct}%
      </span>
    </span>
  );
}
