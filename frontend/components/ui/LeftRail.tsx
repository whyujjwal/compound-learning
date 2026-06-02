"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackAccent } from "@/lib/trackColors";
import type { Track, CurriculumOverview } from "@/lib/api";

const WORKSPACE = [
  { href: "/", label: "Today", note: "Queue", match: (p: string) => p === "/" },
  { href: "/schedule", label: "Weekly calendar", note: "Plan", match: (p: string) => p.startsWith("/schedule") },
  { href: "/stats", label: "Progress", note: "Stats", match: (p: string) => p.startsWith("/stats") },
  { href: "/coach", label: "Coach", note: "AI", match: (p: string) => p.startsWith("/coach") },
];

const LEARN = [
  { href: "/explore", label: "Explore", note: "Catalog", match: (p: string) => p.startsWith("/explore") },
  { href: "/curriculum", label: "My library", note: "Roadmap", match: (p: string) => p === "/curriculum" || p.startsWith("/track/") },
  {
    href: "/curriculum/build",
    label: "Build roadmap",
    note: "Generate",
    match: (p: string) => p.startsWith("/curriculum/build"),
  },
  { href: "/curriculum/edit", label: "Roadmap editor", note: "Edit", match: (p: string) => p.startsWith("/curriculum/edit") },
];

const FOOTER = [
  { href: "/tracks", label: "Tracks", note: "Admin", match: (p: string) => p === "/tracks" },
  { href: "/materials", label: "Materials", note: "Resources", match: (p: string) => p.startsWith("/materials") },
  { href: "/cards", label: "Cards", note: "FSRS", match: (p: string) => p.startsWith("/cards") },
  { href: "/team", label: "Team", note: "Org", match: (p: string) => p.startsWith("/team") },
  { href: "/settings", label: "Settings", note: "Profile", match: (p: string) => p.startsWith("/settings") },
];

export function LeftRail({
  tracks,
  overview,
}: {
  tracks: Track[];
  overview: CurriculumOverview | null;
}) {
  const pathname = usePathname() || "/";

  const trackProgress: Record<string, { pct: number }> = {};
  if (overview) {
    for (const t of overview.tracks) {
      const pct = t.material_count ? t.mastered_count / t.material_count : 0;
      trackProgress[t.slug] = { pct };
    }
  }

  return (
    <aside className="rail">
      <div className="rail-section" aria-label="Workspace">
        <div className="rail-label">Workspace</div>
        {WORKSPACE.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rail-link${l.match(pathname) ? " active" : ""}`}
          >
            <span>{l.label}</span>
            <span className="rail-link-note">{l.note}</span>
          </Link>
        ))}
      </div>

      <div className="rail-section" aria-label="Learn">
        <div className="rail-label">Learn</div>
        {LEARN.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rail-link${l.match(pathname) ? " active" : ""}`}
          >
            <span>{l.label}</span>
            <span className="rail-link-note">{l.note}</span>
          </Link>
        ))}
      </div>

      <div className="rail-section" aria-label="Tracks">
        <div className="rail-label">Active tracks</div>
        {tracks.length === 0 ? (
          <p className="rail-empty">No tracks yet. Generate one in AI Studio or explore public roadmaps.</p>
        ) : (
          tracks.map((t) => {
            const accent = trackAccent(t.slug, t.color);
            const pct = trackProgress[t.slug]?.pct ?? 0;
            const isActive = pathname === `/track/${t.slug}`;
            return (
              <Link
                key={t.id}
                href={`/track/${t.slug}`}
                className={`rail-track${isActive ? " active" : ""}`}
                style={{ ["--track-color" as string]: accent }}
                title={t.name}
              >
                <span className="rail-track-dot" aria-hidden />
                <span className="rail-track-name">{t.name}</span>
                <span className="rail-track-pct" aria-hidden>
                  {Math.round(pct * 100)}%
                </span>
              </Link>
            );
          })
        )}
      </div>

      <div className="rail-footer">
        <div className="rail-label">Tools</div>
        {FOOTER.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className={`rail-link rail-link-muted${v.match(pathname) ? " active" : ""}`}
          >
            <span>{v.label}</span>
            <span className="rail-link-note">{v.note}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
