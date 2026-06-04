"use client";

import Link from "next/link";
import { EmptyState } from "@/components/primitives";
import { Button } from "@/components/primitives";

export function EmptyLibrary({
  onImportExamples,
  importing,
}: {
  onImportExamples?: () => void;
  importing?: boolean;
}) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
          <rect x="4" y="6" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 12h12M10 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      }
      title="Your library is empty"
      description="Adopt a public syllabus from Explore, generate one with AI, or create a manual syllabus to start learning."
      action={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/explore">
            <Button variant="primary" size="sm">Explore public syllabi</Button>
          </Link>
          <Link href="/library/new">
            <Button variant="secondary" size="sm">Generate with AI</Button>
          </Link>
          <Link href="/library/new">
            <Button variant="ghost" size="sm">Start empty</Button>
          </Link>
          {onImportExamples && (
            <Button variant="ghost" size="sm" onClick={onImportExamples} disabled={importing} loading={importing}>
              Import examples
            </Button>
          )}
        </div>
      }
    />
  );
}
