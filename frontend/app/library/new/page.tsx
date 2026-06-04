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

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 10px",
  borderRadius: 4,
  border: "1px solid var(--hairline)",
  background: "var(--canvas)",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  transition: "border-color 100ms",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: "auto",
  padding: "8px 10px",
  resize: "vertical" as const,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text)",
};

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
      <header style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Library</p>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>New Syllabus</h1>
      </header>
      <form
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 520,
        }}
        onSubmit={generateWithAi}
      >
        <label style={labelStyle}>
          <span style={labelTextStyle}>Name</span>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Backend Engineering"
            required
          />
        </label>
        <label style={labelStyle}>
          <span style={labelTextStyle}>What do you want to master?</span>
          <textarea
            style={textareaStyle}
            rows={3}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Build production HTTP services in Go: concurrency, testing, deployment."
          />
        </label>
        <label style={labelStyle}>
          <span style={labelTextStyle}>Level (optional)</span>
          <input
            style={inputStyle}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="beginner / intermediate / advanced"
          />
        </label>
        {error && (
          <p
            style={{
              fontSize: 13,
              color: "var(--bad)",
              background: "color-mix(in srgb, var(--bad) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--bad) 20%, transparent)",
              borderRadius: 4,
              padding: "8px 12px",
            }}
          >
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            style={{
              height: 34,
              padding: "0 16px",
              borderRadius: 4,
              border: "1px solid transparent",
              background: "var(--accent)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 500,
              cursor: busy !== null || !name.trim() || !goal.trim() ? "not-allowed" : "pointer",
              opacity: busy !== null || !name.trim() || !goal.trim() ? 0.5 : 1,
              transition: "background 100ms",
            }}
            disabled={busy !== null || !name.trim() || !goal.trim()}
          >
            {busy === "ai" ? "Generating course…" : "Generate with AI"}
          </button>
          <button
            type="button"
            style={{
              height: 34,
              padding: "0 16px",
              borderRadius: 4,
              border: "1px solid var(--hairline)",
              background: "var(--canvas)",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 500,
              cursor: busy !== null || !name.trim() ? "not-allowed" : "pointer",
              opacity: busy !== null || !name.trim() ? 0.5 : 1,
              transition: "background 100ms",
            }}
            disabled={busy !== null || !name.trim()}
            onClick={startEmpty}
          >
            {busy === "empty" ? "Creating…" : "Start empty"}
          </button>
          <Link
            href="/library"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 34,
              padding: "0 14px",
              borderRadius: 4,
              border: "1px solid var(--hairline)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Cancel
          </Link>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12.5 }}>
          AI builds a 3-level structure and sources open-source materials. You review every change as a diff
          before anything is applied.
        </p>
      </form>
    </>
  );
}
