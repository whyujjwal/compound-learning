"use client";

import Link from "next/link";
import { Badge } from "@/components/primitives";
import { Button } from "@/components/primitives";
import { trackAccent } from "@/lib/trackColors";
import type { SyllabusDetail } from "../types";

// Inline mini progress ring (does not depend on the tested ProgressRing component)
function MiniRing({ pct }: { pct: number }) {
  const radius = 10;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r={radius} stroke="var(--hairline)" strokeWidth="2.2" fill="none" />
      {pct > 0 && (
        <circle
          cx="12" cy="12" r={radius}
          stroke={pct === 100 ? "var(--ok)" : "var(--accent)"}
          strokeWidth="2.2"
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
        />
      )}
    </svg>
  );
}

export function SyllabusHeader({
  syllabus,
  nextActionHref,
  dueCount,
}: {
  syllabus: SyllabusDetail;
  nextActionHref?: string | null;
  /** Optional number of items due for review (from SyllabusListItem) */
  dueCount?: number;
}) {
  const accent = trackAccent(syllabus.slug, syllabus.color);
  const materialCount = syllabus.modules.reduce((sum, m) => sum + m.material_count, 0);
  const masteredCount = syllabus.modules.reduce((sum, m) => sum + m.mastered_count, 0);
  const startedCount = syllabus.modules.reduce((sum, m) => sum + m.started_count, 0);
  const pct = materialCount ? Math.round((masteredCount / materialCount) * 100) : 0;
  const moduleCount = syllabus.modules.length;
  const due = dueCount ?? 0;

  // Determine the study action: prefer the "study now" route for due reviews
  const studyHref = due > 0 ? "/" : nextActionHref;

  return (
    <div style={{ paddingTop: 40, paddingBottom: 20, borderBottom: "1px solid var(--hairline)" }}>
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        <Link
          href="/library"
          style={{ color: "var(--muted)", textDecoration: "none", transition: "color var(--dur-fast)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
        >
          Library
        </Link>
        <span style={{ opacity: 0.4 }}>/</span>
        <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
          {syllabus.name}
        </span>
      </div>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            marginTop: 7,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: accent,
          }}
        />
        <h1 style={{
          flex: 1,
          fontSize: 26,
          fontWeight: 700,
          color: "var(--text)",
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
        }}>
          {syllabus.name}
        </h1>
        {syllabus.visibility === "PUBLIC" && (
          <Badge color="accent" style={{ flexShrink: 0, marginTop: 6 }}>Public</Badge>
        )}
      </div>

      {syllabus.summary && (
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12, paddingLeft: 20 }}>
          {syllabus.summary}
        </p>
      )}

      {/* Mastery progress bar */}
      {materialCount > 0 && (
        <div style={{ paddingLeft: 20, marginBottom: 14 }}>
          {/* Bar + ring row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <MiniRing pct={pct} />
            <div
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                background: "var(--hairline)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  borderRadius: 3,
                  background: pct === 100 ? "var(--ok)" : "var(--accent)",
                  transition: "width 400ms ease",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: pct === 100 ? "var(--ok)" : "var(--text)",
                fontVariantNumeric: "tabular-nums",
                minWidth: 36,
                textAlign: "right",
              }}
            >
              {pct}%
            </span>
          </div>

          {/* Inline stat pills */}
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            <span>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>{masteredCount}</span>
              /{materialCount} mastered
            </span>
            {startedCount > 0 && (
              <>
                <span aria-hidden style={{ opacity: 0.4 }}>·</span>
                <span>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>{startedCount}</span>
                  {" "}started
                </span>
              </>
            )}
            {due > 0 && (
              <>
                <span aria-hidden style={{ opacity: 0.4 }}>·</span>
                <span>
                  <span style={{ color: "var(--warn)", fontWeight: 600 }}>{due}</span>
                  {" "}due for review
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats + actions row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        paddingLeft: 20,
        flexWrap: "wrap",
      }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { value: moduleCount, label: "modules" },
            { value: materialCount, label: "materials" },
          ].map(({ value, label }) => (
            <div key={label}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                {value}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {/* Study now: prominent when due reviews exist */}
          {due > 0 && studyHref && (
            <Link href={studyHref}>
              <Button variant="primary" size="sm">
                Study now
                {" "}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.22)",
                    fontSize: 11,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    marginLeft: 2,
                    padding: "0 5px",
                  }}
                >
                  {due}
                </span>
              </Button>
            </Link>
          )}

          {/* Continue: shown when no due reviews but there is a next action */}
          {due === 0 && nextActionHref && (
            <Link href={nextActionHref}>
              <Button variant="primary" size="sm">Continue</Button>
            </Link>
          )}

          <Link href={`/library/${syllabus.slug}?tab=studio`}>
            <Button variant="secondary" size="sm">Edit in Studio</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
