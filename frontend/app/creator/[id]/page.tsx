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

  if (!profile) return <p style={{ color: "var(--muted)" }}>{error ?? "Loading creator..."}</p>;

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: 32,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Creator profile</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>{profile.display_name || "Compound creator"}</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>Public tracks, stars, adoptions, and learner ratings from this creator.</p>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}><strong style={{ color: "var(--text)", fontWeight: 600 }}>{profile.track_count}</strong> tracks</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}><strong style={{ color: "var(--text)", fontWeight: 600 }}>{profile.total_stars}</strong> stars</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}><strong style={{ color: "var(--text)", fontWeight: 600 }}>{profile.total_adoptions}</strong> adoptions</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}><strong style={{ color: "var(--text)", fontWeight: 600 }}>{profile.avg_rating.toFixed(1)}</strong> avg rating</span>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {profile.tracks.map((track, index) => {
          const accent = trackAccent(track.slug, track.color);
          return (
            <article
              key={track.id}
              style={{
                borderRadius: 6,
                border: "1px solid var(--hairline)",
                background: "var(--panel)",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: accent,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--muted)",
                    padding: "2px 6px",
                    borderRadius: 3,
                    border: "1px solid var(--hairline)",
                  }}
                >
                  #{index + 1}
                </span>
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{track.name}</h2>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, flex: 1 }}>{track.description ?? "A public learning roadmap."}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
                <span>{track.material_count} materials</span>
                <span>{track.star_count} stars</span>
                <span>{track.adoption_count} adopted</span>
                <span>{Math.round(track.quality_score)} quality</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/explore/${track.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 4,
                    border: "1px solid var(--hairline)",
                    background: "var(--canvas)",
                    color: "var(--text)",
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: "none",
                    transition: "background 100ms, border-color 100ms",
                  }}
                >
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
