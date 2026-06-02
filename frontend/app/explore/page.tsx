"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { api, type CatalogCollection, type CatalogTrack, type Leaderboards } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";

type SortMode = "ranking" | "stars" | "new";

function modulesPreview(count: number): string[] {
  if (count <= 0) return ["Roadmap", "Practice", "Review"];
  return ["Foundations", "Core modules", "Practice", "Checkpoint", "Capstone"].slice(0, Math.max(3, Math.min(5, count)));
}

export default function ExplorePage() {
  const { reloadAll, setRightPanel } = useShell();
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("ranking");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [collections, setCollections] = useState<CatalogCollection[]>([]);
  const [leaderboards, setLeaderboards] = useState<Leaderboards | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTracks(await api.getCatalogTracks({ q: query, sort, featured: featuredOnly, limit: 80 }));
    } finally {
      setLoading(false);
    }
  }, [query, sort, featuredOnly]);

  useEffect(() => {
    const t = window.setTimeout(load, 180);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.getCatalogCollections().then(setCollections).catch(() => {});
    api.getLeaderboards().then(setLeaderboards).catch(() => {});
  }, []);

  const featured = useMemo(() => tracks.filter((track) => track.is_featured), [tracks]);

  useEffect(() => {
    setRightPanel(
      <RightPanel>
        <PanelSection label="Ranking">
          <div className="panel-copy">
            Rank blends stars, featured status, freshness, and material depth. Stars are public signals;
            adopting a track creates your own private learning copy.
          </div>
        </PanelSection>
        <PanelSection label="Featured">
          <div className="explore-side-list">
            {(featured.length ? featured : tracks.slice(0, 4)).map((track) => (
              <span key={track.id}>{track.name} · {track.star_count} stars</span>
            ))}
          </div>
        </PanelSection>
        {leaderboards && (
          <PanelSection label="Creators">
            <div className="explore-side-list">
              {leaderboards.creators.slice(0, 5).map((creator) => (
                <Link key={creator.id} href={`/creator/${creator.id}`}>
                  {creator.display_name || "Creator"} · {creator.total_stars} stars
                </Link>
              ))}
            </div>
          </PanelSection>
        )}
      </RightPanel>
    );
    return () => setRightPanel(null);
  }, [featured, leaderboards, setRightPanel, tracks]);

  async function toggleStar(track: CatalogTrack) {
    setBusyId(track.id);
    try {
      const updated = track.is_starred
        ? await api.unstarCatalogTrack(track.id)
        : await api.starCatalogTrack(track.id);
      setTracks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } finally {
      setBusyId(null);
    }
  }

  async function adopt(track: CatalogTrack) {
    setBusyId(track.id);
    setMessage(null);
    try {
      const result = await api.adoptCatalogTrack(track.id);
      await reloadAll();
      setMessage(`Added ${track.name} to your library with ${result.materials_created} materials.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not adopt this track.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="explore-hero">
        <div>
          <p className="page-kicker">Explore</p>
          <h1 className="explore-title">Ranked roadmaps from the learning graph.</h1>
          <p className="explore-sub">
            Search public tracks, star the best ones, and adopt a private copy you can schedule,
            remix, quiz, and keep improving with AI.
          </p>
        </div>
        <Link href="/curriculum/build" className="v2-btn primary">
          Create public track
        </Link>
      </header>

      <section className="explore-search">
        <input
          className="v2-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search system design, Kafka, ML, interviews, projects..."
        />
        <div className="explore-filters" aria-label="Catalog filters">
          <button
            type="button"
            className={`explore-filter-btn${sort === "ranking" ? " active" : ""}`}
            onClick={() => setSort("ranking")}
          >
            Ranking
          </button>
          <button
            type="button"
            className={`explore-filter-btn${sort === "stars" ? " active" : ""}`}
            onClick={() => setSort("stars")}
          >
            Stars
          </button>
          <button
            type="button"
            className={`explore-filter-btn${sort === "new" ? " active" : ""}`}
            onClick={() => setSort("new")}
          >
            New
          </button>
          <button
            type="button"
            className={`explore-filter-btn${featuredOnly ? " active" : ""}`}
            onClick={() => setFeaturedOnly((v) => !v)}
          >
            Featured
          </button>
        </div>
      </section>

      {message && <p className="week-canvas-message">{message}</p>}
      {loading && <p style={{ color: "var(--fg-mute)" }}>Loading ranked tracks...</p>}

      {collections.length > 0 && (
        <section className="catalog-collections">
          {collections.slice(0, 3).map((collection) => (
            <article key={collection.id} className="catalog-collection">
              <div>
                <span>{collection.tracks.length} tracks</span>
                <h2>{collection.title}</h2>
                {collection.description && <p>{collection.description}</p>}
              </div>
              <div className="catalog-collection-strip">
                {collection.tracks.slice(0, 4).map((track) => (
                  <Link key={track.id} href={`/explore/${track.id}`}>
                    {track.name}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {leaderboards && (
        <section className="leaderboard-strip">
          <div>
            <span>Top track</span>
            <strong>{leaderboards.tracks[0]?.name ?? "No tracks yet"}</strong>
          </div>
          <div>
            <span>Top creator</span>
            <strong>{leaderboards.creators[0]?.display_name ?? "No creators yet"}</strong>
          </div>
          <div>
            <span>Signal</span>
            <strong>Stars · quality · adoption · rating</strong>
          </div>
        </section>
      )}

      {!loading && tracks.length === 0 && (
        <section className="empty-today">
          <h2 className="empty-today-title">No public tracks found.</h2>
          <p className="empty-today-sub">
            Generate the first one in AI Studio. Public tracks become searchable and rankable.
          </p>
          <Link href="/curriculum/build" className="v2-btn primary" style={{ marginTop: 12 }}>
            Open AI Studio
          </Link>
        </section>
      )}

      <div className="explore-grid">
        {tracks.map((track, index) => {
          const accent = trackAccent(track.slug, track.color);
          const modules = modulesPreview(track.module_count);
          return (
            <article
              key={track.id}
              className="explore-card"
              style={{ ["--track-color" as string]: accent }}
            >
              <div className="explore-card-top">
                <span className="track-dot" aria-hidden />
                <div className="explore-rank">
                  <span>#{index + 1}</span>
                  {track.is_featured && <span className="pill muted">featured</span>}
                </div>
              </div>
              <h2>{track.name}</h2>
              <p>
                {track.description ??
                  `A public ${track.name} roadmap with structured materials and practice.`}
              </p>
              <div className="explore-card-meta">
                <span>{track.material_count} materials</span>
                <span>{track.module_count} modules</span>
                <span>{track.star_count} stars</span>
                <span>{track.adoption_count} adopted</span>
                <span>{track.rating_avg.toFixed(1)} rating</span>
                <span>{Math.round(track.quality_score)} quality</span>
                <span>score {Math.round(track.rank_score)}</span>
              </div>
              <div className="explore-module-strip">
                {modules.map((module) => (
                  <span key={module}>{module}</span>
                ))}
              </div>
              <div className="explore-card-actions">
                <Link href={`/explore/${track.id}`} className="v2-btn sm">
                  Details
                </Link>
                <button
                  type="button"
                  className="v2-btn sm ghost"
                  disabled={busyId === track.id}
                  onClick={() => adopt(track)}
                >
                  Adopt
                </button>
                <button
                  type="button"
                  className="v2-btn sm ghost"
                  disabled={busyId === track.id}
                  onClick={() => toggleStar(track)}
                >
                  {track.is_starred ? "Starred" : "Star"}
                </button>
                <Link href="/curriculum/build" className="v2-btn sm ghost">
                  Remix
                </Link>
                <Link href={`/creator/${track.creator_id}`} className="v2-btn sm ghost">
                  Creator
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
