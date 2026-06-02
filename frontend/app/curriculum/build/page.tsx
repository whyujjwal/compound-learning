"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type GeneratedRoadmap, type RoadmapGenerationSummary, type WeekdayKey } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";

const DAY_LABELS: [WeekdayKey, string][] = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
];

const EXAMPLES = [
  "Create a complete System Design track for backend interviews with modules, projects, and case studies.",
  "Build a 12-week AI Engineering track from math foundations to RAG, evals, and deployment.",
  "Turn FAANG interview prep into a daily roadmap with DSA, system design, and behavioral practice.",
  "Make a project-based Rust backend track with networking, databases, observability, and a capstone.",
];

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type PreviewMaterial = GeneratedRoadmap["curriculum"]["tracks"][number]["materials"][number];

function groupByModule(materials: PreviewMaterial[]): [string, PreviewMaterial[]][] {
  const groups = new Map<string, PreviewMaterial[]>();
  for (const material of materials) {
    const label = material.block_label || "Core module";
    groups.set(label, [...(groups.get(label) ?? []), material]);
  }
  return Array.from(groups.entries());
}

function countByIntent(materials: PreviewMaterial[], pattern: RegExp): number {
  return materials.filter((m) => pattern.test(`${m.title} ${m.type ?? ""} ${m.notes ?? ""}`)).length;
}

function RoadmapPreview({
  curriculum,
  onApply,
  applying,
}: {
  curriculum: GeneratedRoadmap["curriculum"];
  onApply: (replace: boolean) => void;
  applying: boolean;
}) {
  const colorBySlug: Record<string, string> = {};
  curriculum.tracks.forEach((t) => {
    colorBySlug[t.slug] = trackAccent(t.slug, t.color);
  });

  return (
    <section className="roadmap-preview">
      <div className="roadmap-preview-head">
        <h2 className="roadmap-preview-title">
          Your roadmap · {curriculum.tracks.length} track
          {curriculum.tracks.length === 1 ? "" : "s"}
        </h2>
        <div className="roadmap-preview-actions">
          <button
            type="button"
            className="v2-btn ghost"
            onClick={() => onApply(false)}
            disabled={applying}
          >
            Save to my library
          </button>
          <button
            type="button"
            className="v2-btn primary"
            onClick={() => onApply(true)}
            disabled={applying}
          >
            {applying ? "Applying…" : "Replace & start"}
          </button>
        </div>
      </div>

      <div className="roadmap-week">
        {DAY_LABELS.map(([key, label]) => {
          const blocks = curriculum.weekly_schedule[key] ?? [];
          return (
            <div key={key} className="roadmap-week-day">
              <span className="roadmap-week-label">{label}</span>
              <div className="roadmap-week-dots">
                {blocks.length === 0 && <span className="roadmap-week-rest">rest</span>}
                {blocks.map((b, i) => (
                  <span
                    key={i}
                    className="roadmap-week-dot"
                    title={b.track}
                    style={{ background: colorBySlug[b.track] ?? "#94a3b8" }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="roadmap-tracks">
        {curriculum.tracks.map((t) => {
          const modules = groupByModule(t.materials);
          const quizzes = countByIntent(t.materials, /\b(quiz|checkpoint|test)\b/i);
          const hard = countByIntent(t.materials, /\b(hard|challenge|capstone|project)\b/i);
          const easy = countByIntent(t.materials, /\b(easy|warmup|beginner|foundation)\b/i);

          return (
            <article
              key={t.slug}
              className="roadmap-track card"
              style={{ ["--track-color" as string]: colorBySlug[t.slug] }}
            >
              <header className="roadmap-track-head">
                <span className="roadmap-track-dot" aria-hidden />
                <div>
                  <h3 className="roadmap-track-name">{t.name}</h3>
                  {t.description && <p className="roadmap-track-desc">{t.description}</p>}
                </div>
                <span className="pill muted">{modules.length} modules</span>
              </header>

              <div className="roadmap-quality">
                <span>{t.materials.length} free-resource items</span>
                <span>{quizzes} quizzes/checkpoints</span>
                <span>{easy} easy drills</span>
                <span>{hard} hard challenges</span>
              </div>

              <div className="roadmap-module-preview">
                {modules.slice(0, 5).map(([label, items]) => (
                  <div key={label} className="roadmap-module-preview-row">
                    <div>
                      <strong>{label}</strong>
                      <span>
                        {items.length} items · {items.reduce((sum, m) => sum + m.estimated_minutes, 0)}m
                      </span>
                    </div>
                    <span className="pill tiny">
                      {items.some((m) => /\b(quiz|checkpoint|project)\b/i.test(m.type ?? m.title))
                        ? "checked"
                        : "module"}
                    </span>
                  </div>
                ))}
              </div>

              <ol className="roadmap-track-list">
                {t.materials.slice(0, 6).map((m) => (
                  <li key={m.sequence + m.title} className="roadmap-mat">
                    <span className="roadmap-mat-title">
                      {m.url ? (
                        <a href={m.url} target="_blank" rel="noreferrer">
                          {m.title}
                        </a>
                      ) : (
                        m.title
                      )}
                    </span>
                    <span className="roadmap-mat-meta">
                      {m.type && <span className="pill tiny">{m.type}</span>}
                      <span>{m.estimated_minutes}m</span>
                    </span>
                  </li>
                ))}
                {t.materials.length > 6 && (
                  <li className="roadmap-mat more">+{t.materials.length - 6} more…</li>
                )}
              </ol>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function RoadmapBuilderPage() {
  const router = useRouter();
  const [goals, setGoals] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [level, setLevel] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedRoadmap | null>(null);
  const [history, setHistory] = useState<RoadmapGenerationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refreshHistory = useCallback(() => {
    api.listRoadmapGenerations().then(setHistory).catch(() => {});
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setActiveId(null);
    setLoading(true);
    try {
      const r = await api.generateRoadmap({
        goals,
        weekly_hours: weeklyHours,
        level,
        apply: false,
      });
      setResult(r);
      setActiveId(r.generation_id ?? null);
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadSaved(id: string) {
    setError(null);
    try {
      const row = await api.getRoadmapGeneration(id);
      setGoals(row.goals);
      setWeeklyHours(row.weekly_hours);
      setLevel(row.level ?? "beginner");
      setResult({ curriculum: row.curriculum, applied: row.applied, stats: null, generation_id: row.id });
      setActiveId(row.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load saved roadmap");
    }
  }

  async function applyRoadmap(replace: boolean) {
    if (!result) return;
    setError(null);
    setApplying(true);
    try {
      await api.importCurriculumInline(result.curriculum, replace);
      await api.updateUser({ learning_goals: goals, onboarded: true });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply roadmap");
      setApplying(false);
    }
  }

  return (
    <div className="roadmap-build">
      <header className="page-header">
        <h1 className="page-title">AI Studio</h1>
        <p className="page-sub">
          Generate a serious learning track, remix an existing roadmap, or ask Compound to add
          focused modules and materials around a specific skill.
        </p>
      </header>

      <div className="roadmap-build-layout">
        <div className="roadmap-build-main">
          <section className="studio-modes" aria-label="Studio modes">
            <span className="studio-mode active">Generate track</span>
            <span className="studio-mode">Add module</span>
            <span className="studio-mode">Improve roadmap</span>
            <span className="studio-mode">Create projects</span>
          </section>

          <section className="studio-standards" aria-label="Generation standards">
            <div>
              <strong>Free-first resources</strong>
              <span>Official docs, open courses, GitHub repos, university pages, and reputable videos.</span>
            </div>
            <div>
              <strong>Module checkpoints</strong>
              <span>Each module should end with a quiz, project, or measurable checkpoint.</span>
            </div>
            <div>
              <strong>Easy to hard practice</strong>
              <span>Warmups build confidence, hard tasks force transfer, reviews keep it alive.</span>
            </div>
          </section>

          <form className="roadmap-form card" onSubmit={handleGenerate}>
            <label className="roadmap-label" htmlFor="goals">
              What should this learning track help someone become capable of?
            </label>
            <textarea
              id="goals"
              className="v2-input roadmap-goals"
              rows={5}
              placeholder="e.g. I want a complete system design track that takes a backend engineer from fundamentals to confidently designing feeds, chat, search, payments, and distributed systems."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              required
            />

            <div className="roadmap-examples">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="roadmap-example"
                  onClick={() => setGoals(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="roadmap-controls">
              <label className="roadmap-field">
                <span>Weekly time</span>
                <input
                  type="number"
                  className="v2-input"
                  min={1}
                  max={60}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                />
              </label>
              <label className="roadmap-field">
                <span>Learner level</span>
                <select
                  className="v2-input"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="v2-btn primary roadmap-generate" disabled={loading}>
              {loading ? "Designing the track..." : "Generate learning track"}
            </button>
            {loading && (
              <p className="roadmap-hint">
                Compound researches real resources, sequences modules, estimates effort, and prepares
                a weekly learning loop. Ambitious tracks can take 1-3 minutes.
              </p>
            )}
          </form>

          {result && (
            <RoadmapPreview
              curriculum={result.curriculum}
              onApply={applyRoadmap}
              applying={applying}
            />
          )}
        </div>

        {history.length > 0 && (
          <aside className="roadmap-history card">
            <h2 className="roadmap-history-title">Previous roadmaps</h2>
            <p className="roadmap-history-sub">
              Saved automatically — even if you don&apos;t add them to your library.
            </p>
            <ul className="roadmap-history-list">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`roadmap-history-item${activeId === item.id ? " active" : ""}`}
                    onClick={() => loadSaved(item.id)}
                  >
                    <span className="roadmap-history-item-title">{item.title}</span>
                    <span className="roadmap-history-item-meta">
                      {formatWhen(item.created_at)} · {item.track_count} tracks
                      {item.applied ? " · in library" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
