"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { syllabusApi } from "@/features/syllabus/api/endpoints";
import { api } from "@/lib/api";
import { useShell } from "@/components/ui/Shell";

export default function NewSyllabusPage() {
  const router = useRouter();
  const { reloadAll } = useShell();
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    const slug = autoSlug(name);
    try {
      try {
        const created = await syllabusApi.createSyllabus({
          slug,
          name: name.trim(),
          summary: summary.trim() || undefined,
          visibility: "PRIVATE",
        });
        await reloadAll();
        router.push(`/library/${created.slug}?tab=studio`);
        return;
      } catch {
        await api.createTrack({
          slug,
          name: name.trim(),
          description: summary.trim() || undefined,
          color: "#14b8a6",
        });
        await reloadAll();
        router.push(`/library/${slug}?tab=studio`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create syllabus.");
    } finally {
      setCreating(false);
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
      <form className="canvas-create" onSubmit={onSubmit}>
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
          <span>Goal / summary</span>
          <textarea
            className="v2-input"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What you want to learn and why."
          />
        </label>
        {error && <p className="week-canvas-message">{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="v2-btn primary" disabled={creating}>
            {creating ? "Creating..." : "Create and open Studio"}
          </button>
          <Link href="/library" className="v2-btn ghost">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
