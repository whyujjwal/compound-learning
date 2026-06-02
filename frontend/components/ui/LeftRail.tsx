"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackAccent } from "@/lib/trackColors";
import type { Track, CurriculumOverview } from "@/lib/api";

const LIBRARY = [
  { href: "/tracks", label: "Tracks", match: (p: string) => p === "/tracks" },
  { href: "/materials", label: "Materials", match: (p: string) => p.startsWith("/materials") },
  { href: "/cards", label: "Cards", match: (p: string) => p.startsWith("/cards") },
];

const FOOTER = [
  { href: "/curriculum/build", label: "Build roadmap", match: (p: string) => p.startsWith("/curriculum/build") },
  { href: "/schedule", label: "My week", match: (p: string) => p.startsWith("/schedule") },
  { href: "/curriculum/edit", label: "Editor", match: (p: string) => p.startsWith("/curriculum/edit") },
  { href: "/team", label: "Team", match: (p: string) => p.startsWith("/team") },
  { href: "/settings", label: "Settings", match: (p: string) => p.startsWith("/settings") },
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
      <div className="rail-section" aria-label="Tracks">
        <div className="rail-label">Your tracks</div>
        {tracks.length === 0 ? (
          <p className="rail-empty">No tracks yet — build a roadmap to get started.</p>
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

      <div className="rail-section" aria-label="Library">
        <div className="rail-label">Library</div>
        {LIBRARY.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rail-link${l.match(pathname) ? " active" : ""}`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="rail-footer">
        {FOOTER.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className={`rail-link rail-link-muted${v.match(pathname) ? " active" : ""}`}
          >
            {v.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
