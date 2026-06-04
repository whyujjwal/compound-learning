"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { syllabusApi } from "@/features/syllabus/api/endpoints";
import { generateCourse } from "@/features/course/api/mutations";
import { curriculumKeys } from "@/lib/hooks/useCurriculum";
import { syllabusKeys } from "@/lib/hooks/useSyllabi";

function autoSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function NewSyllabusPage() {
  const router = useRouter();
  const qc = useQueryClient();

  async function refreshLibrary() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: syllabusKeys.list }),
      qc.invalidateQueries({ queryKey: curriculumKeys.overview }),
    ]);
  }
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState<null | "ai" | "empty">(null);
  const [error, setError] = useState<string | null>(null);

  async function generateWithAi(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return;
    setBusy("ai");
    setError(null);
    try {
      const res = await generateCourse({
        name: name.trim(),
        goal: goal.trim(),
        level: level.trim() || undefined,
      });
      await refreshLibrary();
      router.push(`/library/${res.syllabus.slug}?tab=studio`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Try a more specific goal.");
    } finally {
      setBusy(null);
    }
  }

  async function startEmpty() {
    if (!name.trim()) return;
    setBusy("empty");
    setError(null);
    try {
      const created = await syllabusApi.createSyllabus({
        slug: autoSlug(name),
        name: name.trim(),
        summary: goal.trim() || undefined,
        visibility: "PRIVATE",
      });
      await refreshLibrary();
      router.push(`/library/${created.slug}?tab=studio`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create syllabus.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <header className="roadmap-head">
        <div>
          <p className="page-kicker">Library</p>
          <h1 className="roadmap-title">New Syllabus</h1>
        </div>
      </header>
      <form className="canvas-create" onSubmit={generateWithAi}>
        <label>
          <span>Name</span>
          <input
            className="v2-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Backend Engineering"
            required
          />
        </label>
        <label>
          <span>What do you want to master?</span>
          <textarea
            className="v2-input"
            rows={3}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Build production HTTP services in Go: concurrency, testing, deployment."
          />
        </label>
        <label>
          <span>Level (optional)</span>
          <input
            className="v2-input"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="beginner / intermediate / advanced"
          />
        </label>
        {error && <p className="week-canvas-message">{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            className="v2-btn primary"
            disabled={busy !== null || !name.trim() || !goal.trim()}
          >
            {busy === "ai" ? "Generating course…" : "Generate with AI"}
          </button>
          <button
            type="button"
            className="v2-btn"
            disabled={busy !== null || !name.trim()}
            onClick={startEmpty}
          >
            {busy === "empty" ? "Creating…" : "Start empty"}
          </button>
          <Link href="/library" className="v2-btn ghost">
            Cancel
          </Link>
        </div>
        <p style={{ color: "var(--fg-mute)", fontSize: 12.5 }}>
          AI builds a 3-level structure and sources open-source materials. You review every change as a diff
          before anything is applied.
        </p>
      </form>
    </>
  );
}
