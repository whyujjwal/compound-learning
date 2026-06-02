"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type CreatorProfile } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";

export default function CreatorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getCreatorProfile(id).then(setProfile).catch((err) => setError(err instanceof Error ? err.message : "Could not load creator."));
  }, [id]);

  if (!profile) return <p style={{ color: "var(--fg-mute)" }}>{error ?? "Loading creator..."}</p>;

  return (
    <>
      <header className="creator-hero">
        <div>
          <p className="page-kicker">Creator profile</p>
          <h1>{profile.display_name || "Compound creator"}</h1>
          <p>Public tracks, stars, adoptions, and learner ratings from this creator.</p>
        </div>
        <div className="creator-stats">
          <span><strong>{profile.track_count}</strong> tracks</span>
          <span><strong>{profile.total_stars}</strong> stars</span>
          <span><strong>{profile.total_adoptions}</strong> adoptions</span>
          <span><strong>{profile.avg_rating.toFixed(1)}</strong> avg rating</span>
        </div>
      </header>

      <div className="explore-grid">
        {profile.tracks.map((track, index) => {
          const accent = trackAccent(track.slug, track.color);
          return (
            <article
              key={track.id}
              className="explore-card"
              style={{ ["--track-color" as string]: accent }}
            >
              <div className="explore-card-top">
                <span className="track-dot" aria-hidden />
                <div className="explore-rank"><span>#{index + 1}</span></div>
              </div>
              <h2>{track.name}</h2>
              <p>{track.description ?? "A public learning roadmap."}</p>
              <div className="explore-card-meta">
                <span>{track.material_count} materials</span>
                <span>{track.star_count} stars</span>
                <span>{track.adoption_count} adopted</span>
                <span>{Math.round(track.quality_score)} quality</span>
              </div>
              <div className="explore-card-actions">
                <Link href={`/explore/${track.id}`} className="v2-btn sm">
                  View track
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
