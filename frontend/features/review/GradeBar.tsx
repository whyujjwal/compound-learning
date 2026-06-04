"use client";

/**
 * GradeBar — the FSRS 4-button rating strip.
 *
 * Used by both SessionPage (below a card after reveal) and BlockPage
 * (inline within an expanded BlockItemRow after "done working").
 *
 * Design: tasteful Notion-style, near-monochrome with semantic accents.
 * - Again → --bad (red tint)
 * - Hard  → --warn (amber tint)
 * - Good  → --ok (green tint)
 * - Easy  → --accent (blue)
 * Buttons are contained, label + shortcut key hint, 4px radius, no shadows.
 */

import { useEffect } from "react";
import { GRADE_RATINGS, type GradeKey } from "./types";

interface GradeBarProps {
  enabled: boolean;
  submitting: boolean;
  onRate: (grade: GradeKey) => void;
  /** If true, also listen for keyboard shortcuts 1–4 */
  bindKeys?: boolean;
}

export function GradeBar({ enabled, submitting, onRate, bindKeys = false }: GradeBarProps) {
  // Keyboard binding (1–4).
  useEffect(() => {
    if (!bindKeys) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const r = GRADE_RATINGS.find((rt) => rt.shortcut === e.key);
      if (r && enabled && !submitting) onRate(r.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindKeys, enabled, submitting, onRate]);

  return (
    <div
      role="group"
      aria-label="Rate your recall"
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {GRADE_RATINGS.map((r) => (
        <GradeButton
          key={r.key}
          label={r.label}
          shortcut={r.shortcut}
          hint={r.hint}
          tokenVar={r.tokenVar}
          disabled={!enabled || submitting}
          onClick={() => onRate(r.key)}
        />
      ))}
    </div>
  );
}

function GradeButton({
  label,
  shortcut,
  hint,
  tokenVar,
  disabled,
  onClick,
}: {
  label: string;
  shortcut: string;
  hint: string;
  tokenVar: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const colorVar = `var(${tokenVar})`;

  return (
    <button
      type="button"
      title={hint}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 16px",
        borderRadius: 4,
        border: `1px solid ${colorVar}`,
        background: `color-mix(in srgb, ${colorVar} 8%, transparent)`,
        color: colorVar,
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 100ms, opacity 100ms",
        userSelect: "none",
        minWidth: 80,
        justifyContent: "space-between",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            `color-mix(in srgb, ${colorVar} 18%, transparent)`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            `color-mix(in srgb, ${colorVar} 8%, transparent)`;
        }
      }}
    >
      <span>{label}</span>
      <kbd
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: 3,
          border: `1px solid ${colorVar}`,
          fontSize: 11,
          opacity: 0.6,
          fontFamily: "inherit",
          lineHeight: 1,
        }}
      >
        {shortcut}
      </kbd>
    </button>
  );
}
