"use client";

/**
 * ReviewTimer — compact elapsed-time display with pause/resume toggle.
 * Used in the top bar of both Session and Block pages.
 */

import { formatClock } from "./useReviewClock";

interface ReviewTimerProps {
  seconds: number;
  paused: boolean;
  onTogglePause: () => void;
  label?: string;
}

export function ReviewTimer({ seconds, paused, onTogglePause, label }: ReviewTimerProps) {
  return (
    <div
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      title={label ?? (paused ? "Timer paused" : "Elapsed time")}
    >
      {/* Pulsing dot */}
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: paused ? "var(--muted)" : "var(--ok)",
          flexShrink: 0,
          display: "inline-block",
          opacity: paused ? 0.5 : 1,
          animation: paused ? "none" : "timer-pulse 2s ease-in-out infinite",
        }}
      />
      <style>{`@keyframes timer-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          fontSize: 13,
          color: paused ? "var(--muted)" : "var(--text)",
          letterSpacing: "0.02em",
          opacity: paused ? 0.6 : 1,
        }}
        aria-label={`Elapsed: ${formatClock(seconds)}${paused ? " (paused)" : ""}`}
      >
        {formatClock(seconds)}
      </span>
      <button
        type="button"
        aria-pressed={paused}
        aria-label={paused ? "Resume timer" : "Pause timer"}
        onClick={onTogglePause}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 4,
          border: "none",
          background: "transparent",
          color: "var(--muted)",
          cursor: "pointer",
          fontSize: 11,
          lineHeight: 1,
          padding: 0,
          transition: "background 100ms, color 100ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
        }}
      >
        {paused ? "▶" : "⏸"}
      </button>
    </div>
  );
}
