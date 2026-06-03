"use client";

import Link from "next/link";

export function EmptyLibrary({
  onImportExamples,
  importing,
}: {
  onImportExamples?: () => void;
  importing?: boolean;
}) {
  return (
    <section className="canvas-empty">
      <div className="canvas-empty-main">
        <h2>Your library is empty.</h2>
        <p>
          Adopt a public syllabus from Explore, generate one with AI, or create a manual syllabus to
          start learning.
        </p>
        <div className="canvas-empty-actions">
          <Link href="/explore" className="v2-btn primary">
            Explore
          </Link>
          <Link href="/curriculum/build" className="v2-btn ghost">
            Generate with AI
          </Link>
          <Link href="/library/new" className="v2-btn ghost">
            Manual Syllabus
          </Link>
          {onImportExamples && (
            <button type="button" className="v2-btn ghost" onClick={onImportExamples} disabled={importing}>
              {importing ? "Importing..." : "Import examples"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
