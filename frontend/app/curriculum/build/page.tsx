"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type GeneratedRoadmap } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";

const DAY_LABELS: [string, string][] = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
];

const EXAMPLES = [
  "Become a strong backend engineer: master Go, system design, databases, and distributed systems.",
  "Learn machine learning from scratch — the math, classic ML, deep learning, and building LLMs.",
  "Prep for FAANG interviews: data structures & algorithms, system design, and behavioral.",
  "Get fluent in modern web dev: TypeScript, React, Next.js, and product design.",
];

export default function RoadmapBuilderPage() {
  const router = useRouter();
  const [goals, setGoals] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [level, setLevel] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedRoadmap | null>(null);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const r = await api.generateRoadmap({
        goals,
        weekly_hours: weeklyHours,
        level,
        apply: false,
      });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function applyRoadmap(replace: boolean) {
    if (!result) return;
    setError(null);
    setApplying(true);
    try {
      // Import the curriculum we already previewed (no second model call).
      await api.importCurriculumInline(result.curriculum, replace);
      await api.updateUser({ learning_goals: goals, onboarded: true });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply roadmap");
      setApplying(false);
    }
  }

  const colorBySlug: Record<string, string> = {};
  result?.curriculum.tracks.forEach((t) => {
    colorBySlug[t.slug] = trackAccent(t.slug, t.color);
  });

  return (
    <div className="roadmap-build">
      <header className="page-header">
        <h1 className="page-title">Build your roadmap</h1>
        <p className="page-sub">
          Tell Compound what you want to master. It designs personalized tracks with
          real resources from the web and a weekly study schedule.
        </p>
      </header>

      <form className="roadmap-form card" onSubmit={handleGenerate}>
        <label className="roadmap-label" htmlFor="goals">
          What do you want to learn?
        </label>
        <textarea
          id="goals"
          className="v2-input roadmap-goals"
          rows={5}
          placeholder="e.g. I want to master backend engineering: Go, databases, system design, and distributed systems."
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
            <span>Hours per week</span>
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
            <span>Current level</span>
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
          {loading ? "Designing your roadmap…" : "Generate roadmap"}
        </button>
        {loading && (
          <p className="roadmap-hint">
            This can take 20–40 seconds — the coach is researching real materials for you.
          </p>
        )}
      </form>

      {result && (
        <section className="roadmap-preview">
          <div className="roadmap-preview-head">
            <h2 className="roadmap-preview-title">
              Your roadmap · {result.curriculum.tracks.length} track
              {result.curriculum.tracks.length === 1 ? "" : "s"}
            </h2>
            <div className="roadmap-preview-actions">
              <button
                type="button"
                className="v2-btn ghost"
                onClick={() => applyRoadmap(false)}
                disabled={applying}
              >
                Add to my library
              </button>
              <button
                type="button"
                className="v2-btn primary"
                onClick={() => applyRoadmap(true)}
                disabled={applying}
              >
                {applying ? "Applying…" : "Replace & start"}
              </button>
            </div>
          </div>

          <div className="roadmap-week">
            {DAY_LABELS.map(([key, label]) => {
              const blocks = result.curriculum.weekly_schedule[key] ?? [];
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
            {result.curriculum.tracks.map((t) => (
              <article
                key={t.slug}
                className="roadmap-track card"
                style={{ ["--track-color" as string]: colorBySlug[t.slug] }}
              >
                <header className="roadmap-track-head">
                  <span className="roadmap-track-dot" aria-hidden />
                  <div>
                    <h3 className="roadmap-track-name">{t.name}</h3>
                    {t.description && (
                      <p className="roadmap-track-desc">{t.description}</p>
                    )}
                  </div>
                  <span className="pill muted">{t.materials.length} items</span>
                </header>
                <ol className="roadmap-track-list">
                  {t.materials.slice(0, 8).map((m) => (
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
                  {t.materials.length > 8 && (
                    <li className="roadmap-mat more">+{t.materials.length - 8} more…</li>
                  )}
                </ol>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
