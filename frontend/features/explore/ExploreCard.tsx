"use client";

import Link from "next/link";
import type { CatalogTrack } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";

export function ExploreCard({
  track,
  busy,
  onAdopt,
}: {
  track: CatalogTrack;
  busy: boolean;
  onAdopt: (track: CatalogTrack) => void;
}) {
  const accent = trackAccent(track.slug, track.color);
  return (
    <article className="explore-card" style={{ ["--track-color" as string]: accent }}>
      <div className="explore-card-top">
        <span className="track-dot" aria-hidden />
        {track.is_featured && <span className="pill muted">featured</span>}
      </div>
      <h2>{track.name}</h2>
      <p>{track.description ?? `A ${track.name} roadmap with structured materials and practice.`}</p>
      <div className="explore-card-meta">
        <span>{track.material_count} materials</span>
        {track.estimated_hours ? <span>{track.estimated_hours} hours</span> : null}
        {track.difficulty ? <span>{track.difficulty}</span> : null}
        <span>★ {track.star_count}</span>
      </div>
      <div className="explore-card-actions">
        {track.already_in_library ? (
          <>
            <span className="explore-owned">✓ In your library</span>
            <Link href={`/library/${track.slug}`} className="v2-btn sm primary">Open</Link>
          </>
        ) : (
          <button type="button" className="v2-btn sm primary" disabled={busy} onClick={() => onAdopt(track)}>
            {busy ? "Adding…" : "Add to library"}
          </button>
        )}
        <Link href={`/explore/${track.id}`} className="v2-btn sm ghost">Details</Link>
      </div>
    </article>
  );
}
