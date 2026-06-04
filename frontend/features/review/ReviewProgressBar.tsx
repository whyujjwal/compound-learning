"use client";

/**
 * ReviewProgressBar — thin 2px hairline progress strip.
 * Placed immediately below the top bar for both session and block pages.
 */

interface ReviewProgressBarProps {
  done: number;
  total: number;
}

export function ReviewProgressBar({ done, total }: ReviewProgressBarProps) {
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round((done / total) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${done} of ${total} cards`}
      style={{
        width: "100%",
        height: 2,
        background: "var(--hairline)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "var(--accent)",
          transition: "width 300ms var(--ease-out, ease)",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}
