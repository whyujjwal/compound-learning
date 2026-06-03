"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TrackMap } from "@/components/learning/TrackMap";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { useShell } from "@/components/ui/Shell";
import { api, type Material, type QueueItem, type SyllabusModule, type TrackAIUpdate, type TrackProgress } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";

type TrackView = "syllabus" | "map" | "materials";

function countModuleIntent(materials: { title: string; resource_type: string | null; difficulty?: string | null }[], pattern: RegExp): number {
  return materials.filter((m) => pattern.test(`${m.title} ${m.resource_type ?? ""} ${m.difficulty ?? ""}`)).length;
}

function fallbackModules(materials: Material[]): SyllabusModule[] {
  const grouped = materials.reduce<Record<string, Material[]>>((acc, material) => {
    const label = material.block_label || "Core";
    if (!acc[label]) acc[label] = [];
    acc[label].push(material);
    return acc;
  }, {});
  return Object.entries(grouped).map(([label, group], index) => ({
    id: label,
    title: label.includes("·") ? label.split("·").slice(1).join("·").trim() : label,
    description: null,
    objective: `Build working fluency in ${label.toLowerCase()} through resources, practice, and review.`,
    sequence: index + 1,
    estimated_minutes: group.reduce((sum, m) => sum + m.estimated_minutes, 0),
    difficulty: "mixed",
    quiz_prompt: null,
    project_prompt: null,
    material_count: group.length,
    started_count: group.filter((m) => m.card_state && m.card_state !== "NEW").length,
    mastered_count: 0,
    materials: group.map((m) => ({
      id: m.id,
      module_id: m.module_id,
      title: m.title,
      external_url: m.external_url,
      resource_type: m.resource_type,
      estimated_minutes: m.estimated_minutes,
      sequence: m.sequence,
      difficulty: m.difficulty,
      card_state: m.card_state,
    })),
  }));
}

export default function TrackPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const router = useRouter();
  const { tracks, setRightPanel, setActions } = useShell();
  const track = tracks.find((t) => t.slug === slug);
  const accent = trackAccent(slug, track?.color);

  const [progress, setProgress] = useState<TrackProgress | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [view, setView] = useState<TrackView>("syllabus");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiUpdating, setAiUpdating] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<TrackAIUpdate | null>(null);
  const [aiPreviewInstruction, setAiPreviewInstruction] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTrackData = useCallback(async () => {
    if (!slug) return { nextProgress: null, nextMaterials: [] as Material[] };
    const [nextProgress, nextMaterials] = await Promise.all([
      api.getTrackProgress(slug).catch(() => null),
      track ? api.getMaterials(track.id).catch(() => []) : Promise.resolve([]),
    ]);
    return { nextProgress, nextMaterials };
  }, [slug, track]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTrackData()
      .then(({ nextProgress, nextMaterials }) => {
        if (!active || !mountedRef.current) return;
        setProgress(nextProgress);
        setMaterials(nextMaterials);
      })
      .finally(() => {
        if (active && mountedRef.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchTrackData]);

  const modules = useMemo(
    () => (progress?.modules?.length ? progress.modules : track?.modules?.length ? track.modules : fallbackModules(materials)),
    [materials, progress, track]
  );

  const defaultExpanded = useMemo(() => new Set(modules.slice(0, 2).map((module) => module.id)), [modules]);
  const expanded = expandedModules.size ? expandedModules : defaultExpanded;

  const outcome =
    track?.syllabus_summary ||
    track?.description ||
    `Build practical capability in ${progress?.name ?? track?.name ?? "this track"} through a guided roadmap, daily practice, and spaced review.`;
  const outcomes = track?.learning_outcomes?.length
    ? track.learning_outcomes
    : [
        outcome,
        "Move through modules in a clear sequence.",
        "Use quizzes, projects, and reviews to prove mastery.",
        "Ask AI to improve the track as your needs change.",
      ];

  function toggleModule(id: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const startSession = useCallback(
    async (count = 5) => {
      setPulling(true);
      try {
        const items: QueueItem[] = await api.getExtraQueue(slug, count, []);
        if (items.length === 0) return;
        window.sessionStorage.setItem(
          "compound:session-queue",
          JSON.stringify({ ts: Date.now(), context: track?.name ?? "Track", items })
        );
        router.push(`/session/${items[0].card_id}`);
      } finally {
        setPulling(false);
      }
    },
    [slug, track, router]
  );

  const updateTrackWithAI = useCallback(
    async (instruction?: string, apply = true) => {
      if (!track) return;
      const prompt = (instruction ?? aiInstruction).trim();
      if (!prompt) return;
      setAiUpdating(true);
      setAiMessage(null);
      try {
        const result = await api.updateTrackWithAI(track.id, prompt, apply);
        if (result.error) {
          setAiMessage(result.error);
        } else if (!apply) {
          setAiPreview(result);
          setAiPreviewInstruction(prompt);
          setAiMessage(result.result?.summary ?? "Preview ready.");
        } else {
          setAiInstruction("");
          setAiPreview(null);
          setAiPreviewInstruction("");
          setAiMessage(`${result.added_materials} item${result.added_materials === 1 ? "" : "s"} added. ${result.result?.summary ?? "Track updated."}`);
          const { nextProgress, nextMaterials } = await fetchTrackData();
          if (!mountedRef.current) return;
          setProgress(nextProgress);
          setMaterials(nextMaterials);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        setAiMessage(err instanceof Error ? err.message : "Could not update this track.");
      } finally {
        if (mountedRef.current) setAiUpdating(false);
      }
    },
    [aiInstruction, fetchTrackData, track]
  );

  useEffect(() => {
    setActions({
      onStartFirstBlock: () => startSession(8),
      onPushMore: () => startSession(5),
    });
    return () => setActions({});
  }, [setActions, startSession]);

  useEffect(() => {
    setRightPanel(
      <RightPanel>
        {progress && (
          <>
            <PanelSection label="Progress">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="stat">
                  <span className="stat-num">{progress.materials_total ? Math.round((progress.materials_mastered / progress.materials_total) * 100) : 0}%</span>
                  <span className="stat-label">mastered</span>
                  <span className="stat-hint">{progress.materials_mastered} of {progress.materials_total} · {progress.materials_started} started</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{progress.due_reviews}</span>
                  <span className="stat-label">reviews queued</span>
                </div>
              </div>
            </PanelSection>
            <PanelSection label="Syllabus">
              <div className="explore-side-list">
                {modules.slice(0, 6).map((module) => (
                  <span key={module.id}>{module.title} · {module.material_count} items</span>
                ))}
              </div>
            </PanelSection>
          </>
        )}
      </RightPanel>
    );
    return () => setRightPanel(null);
  }, [modules, progress, setRightPanel]);

  if (!track && !loading) {
    return (
      <div className="empty-today">
        <h2 className="empty-today-title">Track not found.</h2>
        <p className="empty-today-sub"><Link href="/curriculum">Back to roadmap</Link></p>
      </div>
    );
  }

  const pctMastered = progress?.materials_total ? progress.materials_mastered / progress.materials_total : 0;
  const pctStarted = progress?.materials_total ? progress.materials_started / progress.materials_total : 0;

  return (
    <>
      <header className="track-hero" style={{ ["--track-color" as string]: accent }}>
        <div className="track-hero-eyebrow">
          <span className="track-dot" aria-hidden /> Learning track · {progress?.materials_total ?? track?.material_count ?? 0} materials
        </div>
        <h1 className="track-hero-name">{progress?.name ?? track?.name}</h1>
        <p className="track-hero-desc">{outcome}</p>

        <div className="track-outcome-grid">
          <div><span>Outcome</span><strong>{outcomes[0]}</strong></div>
          <div><span>Structure</span><strong>{modules.length} modules · ordered materials · review cards</strong></div>
          <div><span>AI loop</span><strong>Extend modules, repair weak spots, or generate projects as the track evolves.</strong></div>
        </div>

        <div className="track-hero-row">
          <div className="track-progress">
            <div className="track-progress-bar">
              <span className="track-progress-bar-started" style={{ width: `${pctStarted * 100}%` }} />
              <span className="track-progress-bar-mastered" style={{ width: `${pctMastered * 100}%` }} />
            </div>
            <div className="track-progress-stats">
              <span>{progress?.materials_started ?? 0} started</span>
              <span>{progress?.materials_mastered ?? 0} mastered</span>
              <span>{progress?.due_reviews ?? 0} reviews queued</span>
            </div>
          </div>
          <div className="track-cta">
            <button type="button" className="v2-btn primary" onClick={() => startSession()} disabled={pulling} style={{ background: accent, color: "#0a0a0d" }}>
              {pulling ? "Loading..." : progress?.next_material_title ? "Continue" : "Start track"}
            </button>
          </div>
        </div>

        {progress?.next_material_title && (
          <div style={{ fontSize: 13, color: "var(--fg-mute)" }}>
            Next: <span style={{ color: "var(--fg-soft)" }}>{progress.next_material_title}</span>
            {progress.next_block_label && <span> · {progress.next_block_label}</span>}
          </div>
        )}

        <form className="track-ai-update" onSubmit={(e) => { e.preventDefault(); updateTrackWithAI(undefined, false); }}>
          <div>
            <span>Dynamic AI track editor</span>
            <strong>Ask for quizzes, better free resources, easy drills, hard challenges, or a new module.</strong>
          </div>
          <input className="v2-input" value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} placeholder="e.g. Add a hard checkpoint and quiz for load balancing" disabled={aiUpdating} />
          <button type="submit" className="v2-btn primary" disabled={aiUpdating || !aiInstruction.trim()}>{aiUpdating ? "Thinking..." : "Preview update"}</button>
        </form>

        {aiPreview?.result?.materials && aiPreview.result.materials.length > 0 && (
          <section className="track-ai-preview">
            <div className="track-ai-preview-head">
              <div><span>AI diff preview</span><strong>{aiPreview.result.summary ?? "Review the proposed additions before applying."}</strong></div>
              <button type="button" className="v2-btn primary" disabled={aiUpdating} onClick={() => updateTrackWithAI(aiPreviewInstruction, true)}>
                Apply {aiPreview.result.materials.length} items
              </button>
            </div>
            <div className="track-ai-preview-list">
              {aiPreview.result.materials.slice(0, 6).map((material) => (
                <div key={`${material.sequence}-${material.title}`}>
                  <strong>{material.title}</strong>
                  <span>{material.type ?? "material"} · {material.estimated_minutes}m · {material.block_label ?? "New module"}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="track-ai-suggestions">
          {["Add a 5-question quiz for this track", "Add easy warmups and hard challenges", "Replace weak links with free official resources", "Add a capstone project"].map((prompt) => (
            <button key={prompt} type="button" className="roadmap-example" disabled={aiUpdating} onClick={() => updateTrackWithAI(prompt, false)}>{prompt}</button>
          ))}
        </div>
        {aiMessage && <p className="week-canvas-message">{aiMessage}</p>}
      </header>

      {modules.length > 0 && (
        <>
          <div className="track-section-label">Syllabus</div>
          <div className="track-syllabus-outcomes">
            {outcomes.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className="track-view-tabs">
            {(["syllabus", "map", "materials"] as const).map((mode) => (
              <button key={mode} type="button" className={`explore-filter-btn${view === mode ? " active" : ""}`} onClick={() => setView(mode)}>
                {mode === "map" ? "Map" : mode === "materials" ? "Materials" : "Syllabus"}
              </button>
            ))}
          </div>

          {view === "map" && <TrackMap modules={modules} accent={accent} title={track?.name ?? progress?.name ?? "Track"} />}

          {view === "syllabus" && (
            <div className="track-modules" style={{ ["--track-color" as string]: accent }}>
              {modules.map((module) => {
                const moduleMaterials = module.materials;
                const pctM = module.material_count ? (module.mastered_count ?? 0) / module.material_count : 0;
                const pctS = module.material_count ? (module.started_count ?? 0) / module.material_count : 0;
                const isOpen = expanded.has(module.id);
                return (
                  <article className="track-module" key={module.id}>
                    <div className="track-module-main">
                      <button type="button" className="syllabus-module-toggle" onClick={() => toggleModule(module.id)}>
                        <div>
                          <h2>{module.title}</h2>
                          <p>{module.objective}</p>
                        </div>
                        <span className="syllabus-module-chevron">{isOpen ? "-" : "+"}</span>
                      </button>
                      <div className="track-block-bar">
                        <span className="track-block-bar-started" style={{ width: `${pctS * 100}%` }} />
                        <span className="track-block-bar-mastered" style={{ width: `${pctM * 100}%` }} />
                      </div>
                      <div className="track-module-meta">
                        <span>{module.started_count ?? 0}/{module.material_count} started</span>
                        <span>{module.mastered_count ?? 0} mastered</span>
                        <span>{module.estimated_minutes} min</span>
                        <span>{module.difficulty}</span>
                      </div>
                      <div className="track-module-quality">
                        <span>{countModuleIntent(moduleMaterials, /\b(quiz|checkpoint|test)\b/i)} quiz/checkpoint</span>
                        <span>{countModuleIntent(moduleMaterials, /\b(easy|warmup|beginner|foundation)\b/i)} easy</span>
                        <span>{countModuleIntent(moduleMaterials, /\b(hard|challenge|capstone|project)\b/i)} hard</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="track-module-materials">
                        {moduleMaterials.map((material) => (
                          <a key={material.id} href={material.external_url ?? `/materials?track=${track?.id ?? ""}`} target={material.external_url ? "_blank" : undefined} rel={material.external_url ? "noreferrer" : undefined} className="track-module-material">
                            <span>{material.title}</span>
                            <small>{material.resource_type ?? "material"} · {material.estimated_minutes}m</small>
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="track-module-actions">
                      <button type="button" className="v2-btn sm ghost" disabled={aiUpdating} onClick={() => updateTrackWithAI(`Add a focused quiz/checkpoint for module: ${module.title}`, false)}>Quick quiz</button>
                      <button type="button" className="v2-btn sm ghost" disabled={aiUpdating} onClick={() => updateTrackWithAI(`Add easy warmup practice for module: ${module.title}`, false)}>Easy drill</button>
                      <button type="button" className="v2-btn sm ghost" disabled={aiUpdating} onClick={() => updateTrackWithAI(`Add a hard challenge problem for module: ${module.title}`, false)}>Hard challenge</button>
                      <button type="button" className="v2-btn sm ghost" disabled={aiUpdating} onClick={() => updateTrackWithAI(`Add a practical project checkpoint for module: ${module.title}`, false)}>Generate project</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {view === "materials" && (
            <div className="track-module-materials">
              {materials.map((material) => (
                <a key={material.id} href={material.external_url ?? `/materials?track=${material.track_id}`} target={material.external_url ? "_blank" : undefined} rel={material.external_url ? "noreferrer" : undefined} className="track-module-material">
                  <span>{material.title}</span>
                  <small>{material.resource_type ?? "material"} · {material.estimated_minutes}m</small>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
