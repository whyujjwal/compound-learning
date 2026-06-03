"use client";

import Link from "next/link";
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

  return (
    <header className="roadmap-head">
      <div>
        <p className="page-kicker">Syllabus</p>
        <h1 className="roadmap-title" style={{ ["--track-color" as string]: accent }}>
          <span className="track-dot" aria-hidden style={{ marginRight: 10 }} />
          {syllabus.name}
        </h1>
        {syllabus.summary && (
          <p style={{ color: "var(--fg-mute)", fontSize: 13, marginTop: 4 }}>{syllabus.summary}</p>
        )}
      </div>
      <div className="roadmap-meta">
        <div className="stat">
          <span className="stat-num">{pct}%</span>
          <span className="stat-label">mastered</span>
        </div>
        <div className="stat">
          <span className="stat-num">{syllabus.modules.length}</span>
          <span className="stat-label">modules</span>
        </div>
        {nextActionHref && (
          <Link href={nextActionHref} className="v2-btn primary">
            Continue
          </Link>
        )}
        <Link href={`/library/${syllabus.slug}?tab=studio`} className="v2-btn ghost">
          Syllabus Studio
        </Link>
      </div>
    </header>
  );
}
