"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { TrackMap } from "@/components/learning/TrackMap";
import { ModuleList } from "@/features/syllabus/components/ModuleList";
import { VirtualMaterialList } from "@/features/syllabus/components/VirtualMaterialList";
import { SyllabusHeader } from "@/features/syllabus/components/SyllabusHeader";
import { SyllabusTabs } from "@/features/syllabus/components/SyllabusTabs";
import { useSyllabusBySlug } from "@/features/syllabus/hooks/useSyllabi";
import { syllabusApi } from "@/features/syllabus/api/endpoints";
import { SyllabusStudioLayout } from "@/features/syllabus/studio/SyllabusStudioLayout";
import { StudioEditor } from "@/features/syllabus/studio/StudioEditor";
import type { ChangeLogEntry, SyllabusProposal, SyllabusTab } from "@/features/syllabus/types";
import { queryKeys } from "@/lib/query/keys";

export default function SyllabusDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = (searchParams.get("tab") as SyllabusTab | null) ?? "overview";
  const [tab, setTab] = useState<SyllabusTab>(initialTab);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [proposals, setProposals] = useState<SyllabusProposal[]>([]);
  const [history, setHistory] = useState<ChangeLogEntry[]>([]);
  const [activeProposal, setActiveProposal] = useState<SyllabusProposal | null>(null);

  const { data: syllabus, isLoading, refetch } = useSyllabusBySlug(slug);
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

  function toggleModule(id: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading || !syllabus) {
    return (
      <>
        <h1 className="roadmap-title">Syllabus</h1>
        <p style={{ color: "var(--fg-mute)" }}>Loading…</p>
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
          {syllabus.outcomes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3>Outcomes</h3>
              <ul>
                {syllabus.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
            </div>
          )}
          <ModuleList
            modules={syllabus.modules}
            expanded={expandedModules}
            onToggle={toggleModule}
          />
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
            <div className="proposal-switcher">
              {proposals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`v2-btn ghost${activeProposal?.id === p.id ? " active" : ""}`}
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
        <div style={{ marginTop: 20, height: 520 }}>
          <TrackMap modules={syllabus.modules} accent={syllabus.color} title={`${syllabus.name} map`} />
        </div>
      )}

      {tab === "materials" && (
        <div style={{ marginTop: 20 }}>
          <VirtualMaterialList materials={allMaterials} />
        </div>
      )}

      {tab === "practice" && (
        <p style={{ marginTop: 20, color: "var(--fg-mute)", fontSize: 13 }}>
          Reviews and practice items for this syllabus. Open{" "}
          <Link href="/">Today</Link> to continue scheduled reviews.
        </p>
      )}

      {tab === "history" && (
        <ul className="module-material-list" style={{ marginTop: 20 }}>
          {history.length === 0 ? (
            <li>No changes recorded yet.</li>
          ) : (
            history.map((entry) => (
              <li key={entry.id}>
                <span>{entry.operation_type}</span>
                <span className="pill muted">{new Date(entry.created_at).toLocaleString()}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </>
  );
}
