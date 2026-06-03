"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackAccent } from "@/lib/trackColors";
import type { Track, CurriculumOverview } from "@/lib/api";

const PRIMARY = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/library", label: "Library", match: (p: string) => p.startsWith("/library") || p.startsWith("/track/") },
  { href: "/explore", label: "Explore", match: (p: string) => p.startsWith("/explore") },
  { href: "/profile", label: "Profile", match: (p: string) => p.startsWith("/profile") || p.startsWith("/settings") || p.startsWith("/progress") || p.startsWith("/stats") },
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
      <div className="rail-section" aria-label="Primary navigation">
        <div className="rail-label">Navigate</div>
        {PRIMARY.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rail-link${l.match(pathname) ? " active" : ""}`}
          >
            <span>{l.label}</span>
          </Link>
        ))}
      </div>

      <div className="rail-section" aria-label="Active syllabi">
        <div className="rail-label">Active syllabi</div>
        {tracks.length === 0 ? (
          <p className="rail-empty">No syllabi yet. Generate one or explore public syllabi.</p>
        ) : (
          tracks.map((t) => {
            const accent = trackAccent(t.slug, t.color);
            const pct = trackProgress[t.slug]?.pct ?? 0;
            const isActive = pathname === `/library/${t.slug}` || pathname === `/track/${t.slug}`;
            return (
              <Link
                key={t.id}
                href={`/library/${t.slug}`}
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
    </aside>
  );
}
