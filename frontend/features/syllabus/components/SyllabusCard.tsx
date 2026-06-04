"use client";

import Link from "next/link";
import { trackAccent } from "@/lib/trackColors";
import type { SyllabusListItem } from "../types";

export function SyllabusCard({ syllabus }: { syllabus: SyllabusListItem }) {
  const accent = trackAccent(syllabus.slug, syllabus.color);
  const pct = syllabus.material_count
    ? Math.round((syllabus.mastered_count / syllabus.material_count) * 100)
    : 0;
  const startedPct = syllabus.material_count
    ? (syllabus.started_count / syllabus.material_count) * 100
    : 0;
  const masteredPct = syllabus.material_count
    ? (syllabus.mastered_count / syllabus.material_count) * 100
    : 0;

  return (
    <Link
      href={`/library/${syllabus.slug}`}
      style={{
        display: "block",
        padding: "14px 16px",
        background: "var(--canvas)",
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        textDecoration: "none",
        transition: "background var(--dur-fast), box-shadow var(--dur-fast)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "var(--overlay-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "var(--canvas)";
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        {/* Color dot */}
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            marginTop: 3,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accent,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {syllabus.name}
            </h3>
            <span style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 500,
              color: pct === 100 ? "var(--ok)" : "var(--muted)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {pct}%
            </span>
          </div>
          {syllabus.summary && (
            <p style={{
              marginTop: 3,
              fontSize: 13,
              color: "var(--muted)",
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}>
              {syllabus.summary}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3,
        background: "var(--hairline)",
        borderRadius: 99,
        overflow: "hidden",
        marginBottom: 10,
        position: "relative",
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${startedPct}%`,
          background: "var(--accent-soft)",
          borderRadius: 99,
        }} />
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${masteredPct}%`,
          background: "var(--accent)",
          borderRadius: 99,
        }} />
      </div>

      {/* Foot stats */}
      <div style={{ display: "flex", gap: 16 }}>
        {[
          { value: syllabus.material_count, label: "materials" },
          { value: syllabus.started_count, label: "started" },
          { value: syllabus.due_review_count, label: "queued" },
        ].map(({ value, label }) => (
          <span key={label} style={{ fontSize: 12, color: "var(--muted)" }}>
            <strong style={{ color: "var(--text)", fontWeight: 600 }}>{value}</strong>
            {" "}{label}
          </span>
        ))}
      </div>
    </Link>
  );
}
