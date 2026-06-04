"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyLibrary } from "@/features/syllabus/components/EmptyLibrary";
import { SyllabusCard } from "@/features/syllabus/components/SyllabusCard";
import { useSyllabiList } from "@/lib/hooks/useSyllabi";
import { useCurriculumOverview, useImportExampleCurriculum } from "@/lib/hooks";

export default function LibraryPage() {
  const { data: overview, isLoading: overviewLoading } = useCurriculumOverview();
  const { data: syllabi = [], isLoading: syllabiLoading } = useSyllabiList();
  const importExamples = useImportExampleCurriculum();
  const [message, setMessage] = useState<string | null>(null);

  async function handleImportExamples() {
    setMessage(null);
    try {
      const result = await importExamples.mutateAsync();
      setMessage(
        `Imported ${result.tracks_created} syllabi and ${result.materials_created} materials.`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not import examples.");
    }
  }

  const isLoading = overviewLoading || syllabiLoading;

  if (!overview || isLoading) {
    return (
      <>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Library</h1>
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </>
    );
  }

  const items =
    syllabi.length > 0
      ? syllabi
      : overview.tracks.map((t) => ({
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
          health_score: t.material_count
            ? Math.round((t.mastered_count / t.material_count) * 100)
            : 100,
          updated_at: new Date().toISOString(),
        }));

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 28,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Personal learning library</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Library</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            Your syllabi — {overview.total_materials} materials across {overview.tracks.length}{" "}
            syllabi.
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{overview.total_mastered}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>mastered</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{overview.due_reviews}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>queued</div>
          </div>
          <Link
            href="/library/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 32,
              padding: "0 14px",
              borderRadius: 4,
              background: "var(--accent)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 100ms",
            }}
          >
            New Syllabus
          </Link>
          <Link
            href="/explore"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 32,
              padding: "0 14px",
              borderRadius: 4,
              border: "1px solid var(--hairline)",
              background: "transparent",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 100ms, color 100ms",
            }}
          >
            Explore
          </Link>
        </div>
      </header>

      {message && (
        <p
          style={{
            fontSize: 13,
            color: "var(--muted)",
            background: "var(--overlay-hover)",
            padding: "8px 12px",
            borderRadius: 4,
            marginBottom: 16,
          }}
        >
          {message}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyLibrary
          onImportExamples={handleImportExamples}
          importing={importExamples.isPending}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((syllabus) => (
            <SyllabusCard key={syllabus.id} syllabus={syllabus} />
          ))}
        </div>
      )}
    </>
  );
}
