"use client";

/**
 * SessionComplete — completion/end-of-queue screen shown after all cards are rated.
 * Shared by the free-form session page (after advancing past the last card).
 *
 * Shows: badge · stat summary · next block CTA or "done for today".
 */

import Link from "next/link";
import type { BlockEntry, Stats } from "@/lib/api/types";
import { formatDuration } from "./useReviewClock";

interface SessionCompleteProps {
  total: number;
  elapsed: number;
  context?: string;
  accent?: string;
  stats: Stats | null;
  nextBlock: BlockEntry | null;
  onStartNext: (block: BlockEntry) => void;
}

export function SessionComplete({
  total,
  elapsed,
  context,
  accent,
  stats,
  nextBlock,
  onStartNext,
}: SessionCompleteProps) {
  const streak = stats?.current_streak ?? 0;
  const reviewsToday = stats?.reviews_today ?? 0;
  const minutesToday = stats?.minutes_today ?? 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 24,
        padding: "64px 24px",
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      {/* Badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 12px",
          borderRadius: 3,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          background: "color-mix(in srgb, var(--ok) 10%, transparent)",
          color: "var(--ok)",
          border: "1px solid color-mix(in srgb, var(--ok) 20%, transparent)",
        }}
      >
        Session complete
      </span>

      {/* Headline */}
      <h1
        style={{
          fontSize: "clamp(26px, 5vw, 38px)",
          fontWeight: 700,
          lineHeight: 1.2,
          color: accent ?? "var(--text)",
          letterSpacing: "-0.02em",
        }}
      >
        {total} card{total === 1 ? "" : "s"} · {formatDuration(elapsed)}
      </h1>

      {context && (
        <p style={{ fontSize: 14, color: "var(--muted)" }}>{context}</p>
      )}

      {/* Stats grid */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            width: "100%",
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid var(--hairline)",
          }}
        >
          {[
            { value: streak, label: "day rhythm" },
            { value: reviewsToday, label: "reviews today" },
            { value: `${minutesToday}m`, label: "invested today" },
          ].map(({ value, label }) => (
            <div
              key={label}
              style={{
                padding: "16px 12px",
                background: "var(--panel)",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.3 }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Sub-copy */}
      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
        {nextBlock
          ? "Nice session. Another block is queued — or stop here, no pressure."
          : "Knowledge compounds. Same time tomorrow, or whenever you're back."}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
        {nextBlock && (
          <button
            type="button"
            onClick={() => onStartNext(nextBlock)}
            style={{
              padding: "10px 20px",
              borderRadius: 4,
              border: "1px solid transparent",
              background: "var(--accent)",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 100ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
            }}
          >
            Next block · {nextBlock.track_name} →
          </button>
        )}
        <Link
          href="/"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("compound:skip-auto-start", "1");
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 20px",
            borderRadius: 4,
            border: "1px solid var(--hairline)",
            background: "transparent",
            color: "var(--muted)",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            transition: "background 100ms, color 100ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--overlay-hover)";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)";
          }}
        >
          {nextBlock ? "Back to Today" : "Done for today"}
        </Link>
      </div>
    </div>
  );
}
