"use client";

import { useState } from "react";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { EmptyLibrary } from "@/features/syllabus/components/EmptyLibrary";
import { SyllabusCard } from "@/features/syllabus/components/SyllabusCard";
import { useSyllabiFromOverview } from "@/features/syllabus/hooks/useSyllabi";
import { api } from "@/lib/api";

export default function LibraryPage() {
  const { overview, reloadAll } = useShell();
  const { data: syllabi = [], isLoading } = useSyllabiFromOverview();
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function importExamples() {
    setImporting(true);
    setMessage(null);
    try {
      const result = await api.importExampleCurriculum();
      await reloadAll();
      setMessage(
        `Imported ${result.tracks_created} syllabi and ${result.materials_created} materials.`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not import examples.");
    } finally {
      setImporting(false);
    }
  }

  if (!overview || isLoading) {
    return (
      <>
        <h1 className="roadmap-title">Library</h1>
        <p style={{ color: "var(--fg-mute)" }}>Loading…</p>
      </>
    );
  }

  const items = syllabi.length > 0 ? syllabi : overview.tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    summary: t.description,
    color: t.color,
    visibility: "PRIVATE" as const,
    module_count: 0,
    material_count: t.material_count,
    started_count: t.started_count,
    mastered_count: t.mastered_count,
    due_review_count: t.due_review_count,
    health_score: t.material_count ? Math.round((t.mastered_count / t.material_count) * 100) : 100,
    updated_at: new Date().toISOString(),
  }));

  return (
    <>
      <header className="roadmap-head">
        <div>
          <p className="page-kicker">Personal learning library</p>
          <h1 className="roadmap-title">Library</h1>
          <p style={{ color: "var(--fg-mute)", fontSize: 13, marginTop: 4 }}>
            Your syllabi — {overview.total_materials} materials across {overview.tracks.length}{" "}
            syllabi.
          </p>
        </div>
        <div className="roadmap-meta">
          <div className="stat">
            <span className="stat-num">{overview.total_mastered}</span>
            <span className="stat-label">mastered</span>
          </div>
          <div className="stat">
            <span className="stat-num">{overview.due_reviews}</span>
            <span className="stat-label">queued</span>
          </div>
          <Link href="/library/new" className="v2-btn primary">
            New Syllabus
          </Link>
          <Link href="/explore" className="v2-btn ghost">
            Explore
          </Link>
        </div>
      </header>

      {message && <p className="week-canvas-message">{message}</p>}

      {items.length === 0 ? (
        <EmptyLibrary onImportExamples={importExamples} importing={importing} />
      ) : (
        <div className="roadmap-grid">
          {items.map((syllabus) => (
            <SyllabusCard key={syllabus.id} syllabus={syllabus} />
          ))}
        </div>
      )}
    </>
  );
}
