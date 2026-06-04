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
    <div style={{ paddingTop: 32, paddingBottom: 20, borderBottom: "1px solid var(--hairline)" }}>
      {/* Breadcrumb */}
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
        <Link href="/library" style={{ color: "var(--muted)" }}>Library</Link>
        <span style={{ margin: "0 6px" }}>·</span>
        <span>Syllabus</span>
      </p>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            marginTop: 6,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: accent,
          }}
        />
        <h1 style={{
          flex: 1,
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text)",
          lineHeight: 1.2,
        }}>
          {syllabus.name}
        </h1>
        {syllabus.visibility === "PUBLIC" && (
          <Badge color="accent" style={{ flexShrink: 0, marginTop: 4 }}>Public</Badge>
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
