"use client";

import Link from "next/link";
import { trackAccent } from "@/lib/trackColors";
import type { SyllabusListItem } from "../types";

export function SyllabusCard({ syllabus }: { syllabus: SyllabusListItem }) {
  const accent = trackAccent(syllabus.slug, syllabus.color);
  const pct = syllabus.material_count
    ? Math.round((syllabus.mastered_count / syllabus.material_count) * 100)
    : 0;

  return (
    <Link
      href={`/library/${syllabus.slug}`}
      className="roadmap-card"
      style={{ ["--track-color" as string]: accent }}
    >
      <div className="roadmap-card-head">
        <h2 className="roadmap-card-title">
          <span className="track-dot" aria-hidden style={{ marginRight: 8 }} />
          {syllabus.name}
        </h2>
        <span className="roadmap-card-pct">{pct}%</span>
      </div>
      {syllabus.summary && <p className="roadmap-card-desc">{syllabus.summary}</p>}
      <div className="bar">
        <span
          className="bar-fill-started"
          style={{
            width: syllabus.material_count
              ? `${(syllabus.started_count / syllabus.material_count) * 100}%`
              : "0%",
          }}
        />
        <span
          className="bar-fill-mastered"
          style={{
            width: syllabus.material_count
              ? `${(syllabus.mastered_count / syllabus.material_count) * 100}%`
              : "0%",
          }}
        />
      </div>
      <div className="roadmap-card-foot">
        <span>
          <strong>{syllabus.material_count}</strong>materials
        </span>
        <span>
          <strong>{syllabus.started_count}</strong>started
        </span>
        <span>
          <strong>{syllabus.due_review_count}</strong>queued
        </span>
      </div>
    </Link>
  );
}
