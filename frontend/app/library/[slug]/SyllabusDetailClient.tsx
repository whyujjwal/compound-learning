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
import { MasterySummaryBar } from "@/features/syllabus/components/MasterySummaryBar";
import { ModuleProgressList } from "@/features/syllabus/components/ModuleProgressList";
import { HealthAlert } from "@/features/syllabus/components/HealthAlert";
import { useSyllabusBySlug, useSyllabiFromOverview } from "@/features/syllabus/hooks/useSyllabi";
import { syllabusApi } from "@/features/syllabus/api/endpoints";
import type { ChangeLogEntry, SyllabusProposal, SyllabusTab } from "@/features/syllabus/types";
import { queryKeys } from "@/lib/query/keys";
import { PageContent } from "@/components/shell";
import { Skeleton, EmptyState, Button } from "@/components/primitives";

const OutlineTree = dynamic(
  () => import("@/features/course/components/OutlineTree").then((m) => ({ default: m.OutlineTree })),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={44} borderRadius={6} />
        ))}
      </div>
    ),
  }
);

const RoadmapCanvas = dynamic(
  () => import("@/features/course/roadmap/RoadmapCanvas").then((m) => ({ default: m.RoadmapCanvas })),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12 }}>
        <Skeleton height={600} borderRadius={6} />
      </div>
    ),
  }
);

const VirtualMaterialList = dynamic(
  () =>
    import("@/features/syllabus/components/VirtualMaterialList").then((m) => ({
      default: m.VirtualMaterialList,
    })),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} height={40} borderRadius={4} />
        ))}
      </div>
    ),
  }
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
  const { data: syllabiList } = useSyllabiFromOverview();
  const qc = useQueryClient();

  // Due review count from list endpoint (not in SyllabusDetail)
  const dueCount = useMemo(() => {
    if (!syllabiList) return 0;
    return syllabiList.find((s) => s.slug === slug)?.due_review_count ?? 0;
  }, [syllabiList, slug]);

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
      <PageContent style={{ paddingTop: 40, paddingBottom: 64 }}>
        {/* Header skeleton */}
        <div style={{ paddingBottom: 20, borderBottom: "1px solid var(--hairline)", marginBottom: 0 }}>
          <Skeleton height={11} width={80} style={{ marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
            <Skeleton height={22} width={22} borderRadius="50%" style={{ flexShrink: 0, marginTop: 2 }} />
            <Skeleton height={26} width="55%" />
          </div>
          <Skeleton height={14} width="70%" style={{ marginBottom: 12, marginLeft: 32 }} />
          <div style={{ display: "flex", gap: 20, paddingLeft: 32, alignItems: "center" }}>
            <Skeleton height={18} width={48} />
            <Skeleton height={18} width={60} />
            <Skeleton height={18} width={64} />
            <div style={{ flex: 1 }} />
            <Skeleton height={30} width={90} borderRadius={4} />
            <Skeleton height={30} width={110} borderRadius={4} />
          </div>
        </div>
        {/* Tabs skeleton */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--hairline)", marginBottom: 20 }}>
          {[80, 56, 72, 74, 60, 60].map((w, i) => (
            <div key={i} style={{ padding: "10px 14px" }}>
              <Skeleton height={14} width={w} borderRadius={3} />
            </div>
          ))}
        </div>
        {/* Content skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={44} borderRadius={6} />
          ))}
        </div>
      </PageContent>
    );
  }

  const allMaterials = syllabus.modules.flatMap((m) => m.materials);

  return (
    <PageContent style={{ paddingTop: 0, paddingBottom: 64 }}>
      <SyllabusHeader syllabus={syllabus} nextActionHref={nextActionHref} dueCount={dueCount} />
      <SyllabusTabs active={tab} onChange={changeTab} />

      {tab === "overview" && (
        <section style={{ marginTop: 20 }}>
          {courseTree ? (
            <>
              {/* Mastery summary strip */}
              <MasterySummaryBar tree={courseTree} dueCount={dueCount} />

              {/* Broken link health alert */}
              <HealthAlert tree={courseTree} />

              {/* Per-module progress overview */}
              {courseTree.modules.length > 0 && (
                <ModuleProgressList modules={courseTree.modules} />
              )}

              {/* Detailed outline tree */}
              <OutlineTree tree={courseTree} />
            </>
          ) : (
            <EmptyState
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 9h10M7 13h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
              title="No outline yet"
              description="Add modules and materials in Studio to build out your syllabus outline."
              action={
                <Button variant="secondary" size="sm" onClick={() => changeTab("studio")}>
                  Open Studio
                </Button>
              }
            />
          )}
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
                  onMouseEnter={(e) => {
                    if (activeProposal?.id !== p.id) {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeProposal?.id !== p.id) {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                    }
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
          {roadmap ? (
            <RoadmapCanvas graph={roadmap} />
          ) : (
            <EmptyState
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="5" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="19" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="19" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7.5 12h4M13.5 7.5l2 3M13.5 16.5l2-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
              title="No roadmap data"
              description="Add prerequisite relationships between modules to generate a dependency roadmap."
            />
          )}
        </div>
      )}

      {tab === "materials" && (
        <div style={{ marginTop: 20 }}>
          {allMaterials.length === 0 ? (
            <EmptyState
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
              title="No materials yet"
              description="Add materials to your modules in Studio to see them listed here."
              action={
                <Button variant="secondary" size="sm" onClick={() => changeTab("studio")}>
                  Open Studio
                </Button>
              }
            />
          ) : (
            <>
              {/* Health alert for broken links in the materials tab */}
              {courseTree && <HealthAlert tree={courseTree} />}

              <VirtualMaterialList materials={allMaterials} />
            </>
          )}
        </div>
      )}

      {tab === "practice" && (
        <div style={{ marginTop: 20 }}>
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="No reviews queued"
            description="Scheduled practice items will appear here. Open Today to continue any pending reviews."
            action={
              <Link href="/">
                <Button variant="primary" size="sm">Go to Today</Button>
              </Link>
            }
          />
        </div>
      )}

      {tab === "history" && (
        <div style={{ marginTop: 20 }}>
          {history.length === 0 ? (
            <EmptyState
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
              title="No changes recorded yet"
              description="Edits made through Studio and AI proposals will be logged here."
            />
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: "0 0 12px",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {history.map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 10px",
                    borderRadius: 4,
                    fontSize: 13,
                    color: "var(--muted)",
                    transition: "background var(--dur-fast)",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLLIElement).style.background = "var(--overlay-hover)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLLIElement).style.background = "transparent")}
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
                      flexShrink: 0,
                    }}
                  >
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </PageContent>
  );
}
