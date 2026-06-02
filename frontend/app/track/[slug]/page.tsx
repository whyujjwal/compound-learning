"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { trackAccent } from "@/lib/trackColors";
import { api, type Material, type QueueItem, type TrackAIUpdate, type TrackProgress } from "@/lib/api";

function countModuleIntent(materials: Material[], pattern: RegExp): number {
  return materials.filter((m) =>
    pattern.test(`${m.title} ${m.resource_type ?? ""} ${m.raw_content ?? ""}`)
  ).length;
}

export default function TrackPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const router = useRouter();
  const { tracks, setRightPanel, setActions } = useShell();

  const [progress, setProgress] = useState<TrackProgress | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiUpdating, setAiUpdating] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<TrackAIUpdate | null>(null);
  const [aiPreviewInstruction, setAiPreviewInstruction] = useState("");
  const mountedRef = useRef(true);

  const track = tracks.find((t) => t.slug === slug);
  const accent = trackAccent(slug, track?.color);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTrackData = useCallback(async () => {
    if (!slug) return { nextProgress: null, nextMaterials: [] as Material[] };
    const [p, m] = await Promise.all([
      api.getTrackProgress(slug).catch(() => null),
      track ? api.getMaterials(track.id).catch(() => []) : Promise.resolve([]),
    ]);
    return { nextProgress: p, nextMaterials: m };
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

  const startSession = useCallback(
    async (count = 5) => {
      setPulling(true);
      try {
        const items: QueueItem[] = await api.getExtraQueue(slug, count, []);
        if (items.length === 0) return;
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "compound:session-queue",
            JSON.stringify({
              ts: Date.now(),
              context: track?.name ?? "Track",
              items,
            })
          );
        }
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
          setAiMessage(
            `${result.added_materials} new item${result.added_materials === 1 ? "" : "s"} added. ${
              result.result?.summary ?? "Track updated."
            }`
          );
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

  // Right panel
  useEffect(() => {
    setRightPanel(
      <RightPanel>
        {progress && (
          <>
            <PanelSection label="Progress">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="stat">
                  <span className="stat-num">
                    {progress.materials_total
                      ? Math.round((progress.materials_mastered / progress.materials_total) * 100)
                      : 0}
                    %
                  </span>
                  <span className="stat-label">mastered</span>
                  <span className="stat-hint">
                    {progress.materials_mastered} of {progress.materials_total} ·{" "}
                    {progress.materials_started} started
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-num">{progress.due_reviews}</span>
                  <span className="stat-label">reviews queued</span>
                </div>
                <div className="stat">
                  <span className="stat-num">
                    {Math.round((progress.avg_retrievability || 0) * 100)}%
                  </span>
                  <span className="stat-label">avg recall</span>
                </div>
              </div>
            </PanelSection>
            <PanelSection label="Recent materials">
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
                {materials.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--fg-soft)",
                      gap: 8,
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.title}
                    </span>
                    <span
                      className="pill muted"
                      style={{ flexShrink: 0, fontSize: 9.5 }}
                    >
                      {m.estimated_minutes}m
                    </span>
                  </div>
                ))}
              </div>
            </PanelSection>
          </>
        )}
      </RightPanel>
    );
    return () => setRightPanel(null);
  }, [progress, materials, setRightPanel]);

  // Cmdk action: start session from this track
  useEffect(() => {
    setActions({
      onStartFirstBlock: () => startSession(8),
      onPushMore: (s) => startSession(5),
    });
    return () => setActions({});
  }, [setActions, startSession]);

  if (!track && !loading) {
    return (
      <div className="empty-today">
        <h2 className="empty-today-title">Track not found.</h2>
        <p className="empty-today-sub">
          <Link href="/curriculum">Back to roadmap</Link>
        </p>
      </div>
    );
  }

  const pctMastered =
    progress && progress.materials_total
      ? progress.materials_mastered / progress.materials_total
      : 0;
  const pctStarted =
    progress && progress.materials_total
      ? progress.materials_started / progress.materials_total
      : 0;
  const materialsByBlock = materials.reduce<Record<string, Material[]>>((acc, material) => {
    const label = material.block_label || "Uncategorized";
    if (!acc[label]) acc[label] = [];
    acc[label].push(material);
    return acc;
  }, {});

  const outcome =
    track?.description ||
    `Build practical capability in ${progress?.name ?? track?.name ?? "this track"} through a guided roadmap, daily practice, and spaced review.`;

  return (
    <>
      <header className="track-hero" style={{ ["--track-color" as string]: accent }}>
        <div className="track-hero-eyebrow">
          <span className="track-dot" aria-hidden /> Learning track ·{" "}
          {progress?.materials_total ?? track?.material_count ?? 0} materials
        </div>
        <h1 className="track-hero-name">{progress?.name ?? track?.name}</h1>
        <p className="track-hero-desc">{outcome}</p>

        <div className="track-outcome-grid">
          <div>
            <span>Outcome</span>
            <strong>Explain, practice, and apply the core ideas without losing them after a week.</strong>
          </div>
          <div>
            <span>Structure</span>
            <strong>{progress?.blocks.length ?? 0} modules · ordered materials · review cards</strong>
          </div>
          <div>
            <span>AI loop</span>
            <strong>Extend modules, repair weak spots, or generate projects as the track evolves.</strong>
          </div>
        </div>

        <div className="track-hero-row">
          <div className="track-progress">
            <div className="track-progress-bar">
              <span
                className="track-progress-bar-started"
                style={{ width: `${pctStarted * 100}%` }}
              />
              <span
                className="track-progress-bar-mastered"
                style={{ width: `${pctMastered * 100}%` }}
              />
            </div>
            <div className="track-progress-stats">
              <span>{progress?.materials_started ?? 0} started</span>
              <span>{progress?.materials_mastered ?? 0} mastered</span>
              <span>{progress?.due_reviews ?? 0} reviews queued</span>
            </div>
          </div>
          <div className="track-cta">
            <Link href={`/graph/${slug}`} className="v2-btn ghost" style={{ marginRight: 8 }}>
              Knowledge graph
            </Link>
            <Link href="/curriculum/build" className="v2-btn ghost">
              Extend with AI
            </Link>
            <button
              type="button"
              className="v2-btn primary"
              onClick={() => startSession()}
              disabled={pulling}
              style={{ background: accent, color: "#0a0a0d" }}
            >
              {pulling
                ? "Loading…"
                : progress?.next_material_title
                ? "Continue →"
                : "Start track →"}
            </button>
          </div>
        </div>

        {progress?.next_material_title && (
          <div style={{ fontSize: 13, color: "var(--fg-mute)" }}>
            Next: <span style={{ color: "var(--fg-soft)" }}>{progress.next_material_title}</span>
            {progress.next_block_label && <span> · {progress.next_block_label}</span>}
          </div>
        )}

        <form
          className="track-ai-update"
          onSubmit={(e) => {
            e.preventDefault();
            updateTrackWithAI(undefined, false);
          }}
        >
          <div>
            <span>Dynamic AI track editor</span>
            <strong>Ask for quizzes, better free resources, easy drills, hard challenges, or a new module.</strong>
          </div>
          <input
            className="v2-input"
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            placeholder="e.g. Add a hard checkpoint and quiz for load balancing"
            disabled={aiUpdating}
          />
          <button type="submit" className="v2-btn primary" disabled={aiUpdating || !aiInstruction.trim()}>
            {aiUpdating ? "Thinking..." : "Preview update"}
          </button>
        </form>
        {aiPreview?.result?.materials && aiPreview.result.materials.length > 0 && (
          <section className="track-ai-preview">
            <div className="track-ai-preview-head">
              <div>
                <span>AI diff preview</span>
                <strong>{aiPreview.result.summary ?? "Review the proposed additions before applying."}</strong>
              </div>
              <button
                type="button"
                className="v2-btn primary"
                disabled={aiUpdating}
                onClick={() => updateTrackWithAI(aiPreviewInstruction, true)}
              >
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
          {[
            "Add a 5-question quiz for this track",
            "Add easy warmups and hard challenges",
            "Replace weak links with free official resources",
            "Add a capstone project",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="roadmap-example"
              disabled={aiUpdating}
              onClick={() => updateTrackWithAI(prompt, false)}
            >
              {prompt}
            </button>
          ))}
        </div>
        {aiMessage && <p className="week-canvas-message">{aiMessage}</p>}
      </header>

      {progress && progress.blocks.length > 0 && (
        <>
          <div className="track-section-label">Roadmap modules</div>
          <div className="track-modules" style={{ ["--track-color" as string]: accent }}>
            {progress.blocks.map((b) => {
              const pctM = b.material_count ? b.mastered_count / b.material_count : 0;
              const pctS = b.material_count ? b.started_count / b.material_count : 0;
              const moduleMaterials = materialsByBlock[b.label] ?? [];
              const quizzes = countModuleIntent(moduleMaterials, /\b(quiz|checkpoint|test)\b/i);
              const easy = countModuleIntent(moduleMaterials, /\b(easy|warmup|beginner|foundation)\b/i);
              const hard = countModuleIntent(moduleMaterials, /\b(hard|challenge|capstone|project)\b/i);
              return (
                <article className="track-module" key={b.label}>
                  <div className="track-module-main">
                    <div className="track-module-head">
                      <div>
                        <h2>{b.label}</h2>
                        <p>
                          Work through the materials, capture the core tradeoffs, then use reviews
                          to keep this module active.
                        </p>
                      </div>
                      <span className="track-module-pct">{Math.round(pctM * 100)}%</span>
                    </div>
                    <div className="track-block-bar">
                      <span
                        className="track-block-bar-started"
                        style={{ width: `${pctS * 100}%` }}
                      />
                      <span
                        className="track-block-bar-mastered"
                        style={{ width: `${pctM * 100}%` }}
                      />
                    </div>
                    <div className="track-module-meta">
                      <span>{b.started_count}/{b.material_count} started</span>
                      <span>{b.mastered_count} mastered</span>
                      <span>{moduleMaterials.reduce((sum, m) => sum + m.estimated_minutes, 0)} min</span>
                    </div>
                    <div className="track-module-quality">
                      <span>{quizzes} quiz/checkpoint</span>
                      <span>{easy} easy</span>
                      <span>{hard} hard</span>
                    </div>
                  </div>

                  <div className="track-module-materials">
                    {moduleMaterials.slice(0, 5).map((material) => (
                      <a
                        key={material.id}
                        href={material.external_url ?? `/materials?track=${material.track_id}`}
                        target={material.external_url ? "_blank" : undefined}
                        rel={material.external_url ? "noreferrer" : undefined}
                        className="track-module-material"
                      >
                        <span>{material.title}</span>
                        <small>
                          {material.resource_type ?? "material"} · {material.estimated_minutes}m
                        </small>
                      </a>
                    ))}
                    {moduleMaterials.length > 5 && (
                      <Link href={`/materials?track=${track?.id ?? ""}`} className="track-module-more">
                        +{moduleMaterials.length - 5} more materials
                      </Link>
                    )}
                  </div>

                  <div className="track-module-actions">
                    <button
                      type="button"
                      className="v2-btn sm ghost"
                      disabled={aiUpdating}
                      onClick={() => updateTrackWithAI(`Add a focused quiz/checkpoint for module: ${b.label}`, false)}
                    >
                      Quick quiz
                    </button>
                    <button
                      type="button"
                      className="v2-btn sm ghost"
                      disabled={aiUpdating}
                      onClick={() => updateTrackWithAI(`Add easy warmup practice for module: ${b.label}`, false)}
                    >
                      Easy drill
                    </button>
                    <button
                      type="button"
                      className="v2-btn sm ghost"
                      disabled={aiUpdating}
                      onClick={() => updateTrackWithAI(`Add a hard challenge problem for module: ${b.label}`, false)}
                    >
                      Hard challenge
                    </button>
                    <button
                      type="button"
                      className="v2-btn sm ghost"
                      disabled={aiUpdating}
                      onClick={() => updateTrackWithAI(`Add a practical project checkpoint for module: ${b.label}`, false)}
                    >
                      Generate project
                    </button>
                    <Link href={`/graph/${slug}`} className="v2-btn sm ghost">
                      Inspect graph
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
