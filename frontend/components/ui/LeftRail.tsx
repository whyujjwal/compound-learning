"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackAccent } from "@/lib/trackColors";
import type { Track, CurriculumOverview } from "@/lib/api";

const VIEWS = [
  { href: "/", label: "Today", icon: "◐", match: (p: string) => p === "/" },
  { href: "/coach", label: "Coach", icon: "◇", match: (p: string) => p.startsWith("/coach") },
  { href: "/stats", label: "Stats", icon: "▤", match: (p: string) => p.startsWith("/stats") },
];

const FOOTER = [
  { href: "/curriculum", label: "Roadmap", icon: "▦", match: (p: string) => p === "/curriculum" },
  { href: "/curriculum/build", label: "Build roadmap", icon: "✦", match: (p: string) => p.startsWith("/curriculum/build") },
  { href: "/curriculum/edit", label: "Editor", icon: "✎", match: (p: string) => p.startsWith("/curriculum/edit") },
  { href: "/team", label: "Team", icon: "◈", match: (p: string) => p.startsWith("/team") },
  { href: "/settings", label: "Settings", icon: "⚙", match: (p: string) => p.startsWith("/settings") },
];

const LIBRARY = [
  { href: "/tracks", label: "Tracks", match: (p: string) => p === "/tracks" },
  { href: "/materials", label: "Materials", match: (p: string) => p.startsWith("/materials") },
  { href: "/cards", label: "Cards", match: (p: string) => p.startsWith("/cards") },
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
      <div className="rail-section">
        {VIEWS.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className={`rail-link${v.match(pathname) ? " active" : ""}`}
          >
            <span className="rail-link-icon" aria-hidden>{v.icon}</span>
            <span className="rail-link-label">{v.label}</span>
          </Link>
        ))}
      </div>

      <div className="rail-section" aria-label="Tracks">
        <div className="rail-label">Tracks</div>
        {tracks.map((t) => {
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
              <span className="rail-track-bar" aria-hidden>
                <span
                  className="rail-track-bar-fill"
                  style={{ ["--pct" as string]: String(pct) }}
                />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="rail-section" aria-label="Library">
        <div className="rail-label">Library</div>
        {LIBRARY.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rail-link${l.match(pathname) ? " active" : ""}`}
          >
            <span className="rail-link-icon" aria-hidden>·</span>
            <span className="rail-link-label">{l.label}</span>
          </Link>
        ))}
      </div>

      <div className="rail-footer">
        {FOOTER.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className={`rail-link${v.match(pathname) ? " active" : ""}`}
          >
            <span className="rail-link-icon" aria-hidden>{v.icon}</span>
            <span className="rail-link-label">{v.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
