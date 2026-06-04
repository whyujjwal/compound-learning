"use client";

import Link from "next/link";
import { Badge } from "@/components/primitives";
import { Button } from "@/components/primitives";
import { trackAccent } from "@/lib/trackColors";
import type { SyllabusDetail } from "../types";

export function SyllabusHeader({
  syllabus,
  nextActionHref,
}: {
  syllabus: SyllabusDetail;
  nextActionHref?: string | null;
}) {
  const accent = trackAccent(syllabus.slug, syllabus.color);
  const materialCount = syllabus.modules.reduce((sum, m) => sum + m.material_count, 0);
  const masteredCount = syllabus.modules.reduce((sum, m) => sum + m.mastered_count, 0);
  const pct = materialCount ? Math.round((masteredCount / materialCount) * 100) : 0;
  const moduleCount = syllabus.modules.length;

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
            { value: `${pct}%`, label: "mastered" },
            { value: moduleCount, label: "modules" },
            { value: materialCount, label: "materials" },
          ].map(({ value, label }) => (
            <div key={label}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
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
          {nextActionHref && (
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
