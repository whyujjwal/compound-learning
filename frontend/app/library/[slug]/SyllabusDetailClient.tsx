"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCourseTree } from "@/features/course/hooks/useCourseTree";
import { useRoadmap } from "@/features/course/hooks/useRoadmap";
import { SyllabusHeader } from "@/features/syllabus/components/SyllabusHeader";
import { SyllabusTabs } from "@/features/syllabus/components/SyllabusTabs";
import { useSyllabusBySlug } from "@/features/syllabus/hooks/useSyllabi";
import { syllabusApi } from "@/features/syllabus/api/endpoints";
import type { ChangeLogEntry, SyllabusProposal, SyllabusTab } from "@/features/syllabus/types";
import { queryKeys } from "@/lib/query/keys";

const OutlineTree = dynamic(
  () => import("@/features/course/components/OutlineTree").then((m) => ({ default: m.OutlineTree })),
  { ssr: false, loading: () => <p style={{ color: "var(--muted)" }}>Loading outline…</p> }
);

const RoadmapCanvas = dynamic(
  () => import("@/features/course/roadmap/RoadmapCanvas").then((m) => ({ default: m.RoadmapCanvas })),
  { ssr: false, loading: () => <p style={{ color: "var(--muted)" }}>Loading roadmap…</p> }
);

const VirtualMaterialList = dynamic(
  () =>
    import("@/features/syllabus/components/VirtualMaterialList").then((m) => ({
      default: m.VirtualMaterialList,
    })),
  { ssr: false, loading: () => <p style={{ color: "var(--muted)" }}>Loading materials…</p> }
);

const SyllabusStudioLayout = dynamic(
  () =>
    import("@/features/syllabus/studio/SyllabusStudioLayout").then((m) => ({
      default: m.SyllabusStudioLayout,
    })),
  { ssr: false }
);

const StudioEditor = dynamic(
  () => import("@/features/syllabus/studio/StudioEditor").then((m) => ({ default: m.StudioEditor })),
  { ssr: false }
);

export default function SyllabusDetailClient() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = (searchParams.get("tab") as SyllabusTab | null) ?? "overview";
  const [tab, setTab] = useState<SyllabusTab>(initialTab);
  const [proposals, setProposals] = useState<SyllabusProposal[]>([]);
  const [history, setHistory] = useState<ChangeLogEntry[]>([]);
  const [activeProposal, setActiveProposal] = useState<SyllabusProposal | null>(null);

  const { data: syllabus, isLoading, refetch } = useSyllabusBySlug(slug);
  const { data: courseTree } = useCourseTree(slug);
  const { data: roadmap } = useRoadmap(slug);
  const qc = useQueryClient();

  useEffect(() => {
    const next = searchParams.get("tab") as SyllabusTab | null;
    if (next) setTab(next);
  }, [searchParams]);

  const loadProposals = useCallback(async () => {
    if (!syllabus) return;
    try {
      const rows = await syllabusApi.listProposals(syllabus.id);
      const ready = rows.filter((p) => p.status === "READY" || p.status === "CONFLICTED");
      setProposals(ready);
      setActiveProposal(ready[0] ?? null);
    } catch {
      setProposals([]);
    }
  }, [syllabus]);

  const loadHistory = useCallback(async () => {
    if (!syllabus) return;
    try {
      setHistory(await syllabusApi.getHistory(syllabus.id));
    } catch {
      setHistory([]);
    }
  }, [syllabus]);

  useEffect(() => {
    if (tab === "studio") loadProposals();
    if (tab === "history") loadHistory();
  }, [tab, loadProposals, loadHistory]);

  const loadProposalsForStudio = useCallback(async () => {
    await loadProposals();
    await refetch();
    await qc.invalidateQueries({ queryKey: queryKeys.syllabus(slug) });
  }, [loadProposals, refetch, qc, slug]);

  const nextActionHref = useMemo(() => {
    if (!syllabus) return null;
    for (const module of syllabus.modules) {
      for (const material of module.materials) {
        if (!material.card_state || material.card_state === "NEW") {
          return material.external_url || `/session/${material.id}`;
        }
      }
    }
    return null;
  }, [syllabus]);

  function changeTab(next: SyllabusTab) {
    setTab(next);
    router.replace(`/library/${slug}?tab=${next}`, { scroll: false });
  }

  if (isLoading || !syllabus) {
    return (
      <>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Syllabus</h1>
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </>
    );
  }

  const allMaterials = syllabus.modules.flatMap((m) => m.materials);

  return (
    <>
      <SyllabusHeader syllabus={syllabus} nextActionHref={nextActionHref} />
      <SyllabusTabs active={tab} onChange={changeTab} />

      {tab === "overview" && (
        <section style={{ marginTop: 20 }}>
          {courseTree ? <OutlineTree tree={courseTree} /> : null}
        </section>
      )}

      {tab === "studio" && (
        <SyllabusStudioLayout syllabus={syllabus}>
          <StudioEditor
            syllabus={syllabus}
            activeProposal={activeProposal}
            onProposalChange={loadProposalsForStudio}
          />
          {proposals.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {proposals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  style={{
                    height: 30,
                    padding: "0 12px",
                    borderRadius: 4,
                    border: "1px solid var(--hairline)",
                    background: activeProposal?.id === p.id ? "var(--overlay-active)" : "transparent",
                    color: activeProposal?.id === p.id ? "var(--text)" : "var(--muted)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 100ms, color 100ms",
                  }}
                  onClick={() => setActiveProposal(p)}
                >
                  {p.summary || p.id.slice(0, 8)}
                </button>
              ))}
            </div>
          )}
        </SyllabusStudioLayout>
      )}

      {tab === "map" && (
        <div style={{ marginTop: 20, height: 600 }}>
          {roadmap ? <RoadmapCanvas graph={roadmap} /> : null}
        </div>
      )}

      {tab === "materials" && (
        <div style={{ marginTop: 20 }}>
          <VirtualMaterialList materials={allMaterials} />
        </div>
      )}

      {tab === "practice" && (
        <p style={{ marginTop: 20, color: "var(--muted)", fontSize: 13 }}>
          Reviews and practice items for this syllabus. Open{" "}
          <Link href="/">Today</Link> to continue scheduled reviews.
        </p>
      )}

      {tab === "history" && (
        <ul
          style={{
            listStyle: "none",
            margin: "20px 0 0",
            padding: "0 0 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {history.length === 0 ? (
            <li style={{ fontSize: 13, color: "var(--muted)" }}>No changes recorded yet.</li>
          ) : (
            history.map((entry) => (
              <li
                key={entry.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                <span style={{ color: "var(--text)" }}>{entry.operation_type}</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--hairline)",
                    fontSize: 11,
                    color: "var(--muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </>
  );
}
