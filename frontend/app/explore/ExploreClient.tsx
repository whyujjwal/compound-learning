"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { api, type CatalogCollection, type CatalogTrack, type Leaderboards } from "@/lib/api";
import { filterCatalogTracks, type CatalogSortMode } from "@/lib/catalog-client";
import { trackAccent } from "@/lib/trackColors";

type ExploreClientProps = {
  initialTracks: CatalogTrack[];
  initialCollections: CatalogCollection[];
  initialLeaderboards: Leaderboards;
};

export function ExploreClient({
  initialTracks,
  initialCollections,
  initialLeaderboards,
}: ExploreClientProps) {
  const { reloadAll, setRightPanel } = useShell();
  const [tracks, setTracks] = useState(initialTracks);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CatalogSortMode>("ranking");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  const visibleTracks = useMemo(
    () => filterCatalogTracks(tracks, { q: query, sort, featuredOnly, limit: 80 }),
    [tracks, query, sort, featuredOnly]
  );

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
              <span key={track.id}>
                {track.name} · {track.star_count} stars
              </span>
            ))}
          </div>
        </PanelSection>
        <PanelSection label="Creators">
          <div className="explore-side-list">
            {initialLeaderboards.creators.slice(0, 5).map((creator) => (
              <Link key={creator.id} href={`/creator/${creator.id}`}>
                {creator.display_name || "Creator"} · {creator.total_stars} stars
              </Link>
            ))}
          </div>
        </PanelSection>
      </RightPanel>
    );
    return () => setRightPanel(null);
  }, [featured, initialLeaderboards.creators, setRightPanel, tracks]);

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

      {initialCollections.length > 0 && (
        <section className="catalog-collections">
          {initialCollections.slice(0, 3).map((collection) => (
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

      <section className="leaderboard-strip">
        <div>
          <span>Top track</span>
          <strong>{initialLeaderboards.tracks[0]?.name ?? "No tracks yet"}</strong>
        </div>
        <div>
          <span>Top creator</span>
          <strong>{initialLeaderboards.creators[0]?.display_name ?? "No creators yet"}</strong>
        </div>
        <div>
          <span>Signal</span>
          <strong>Stars · quality · adoption · rating</strong>
        </div>
      </section>

      {visibleTracks.length === 0 && (
        <section className="empty-today">
          <h2 className="empty-today-title">No public tracks found.</h2>
          <p className="empty-today-sub">
            {query || featuredOnly
              ? "Try a different search or clear filters."
              : "Generate the first one in AI Studio. Public tracks become searchable and rankable."}
          </p>
          {!query && !featuredOnly && (
            <Link href="/curriculum/build" className="v2-btn primary" style={{ marginTop: 12 }}>
              Open AI Studio
            </Link>
          )}
        </section>
      )}

      <div className="explore-grid">
        {visibleTracks.map((track, index) => {
          const accent = trackAccent(track.slug, track.color);
          const modules = track.syllabus_preview?.length
            ? track.syllabus_preview
            : ["Foundations", "Core modules", "Practice", "Checkpoint"].slice(
                0,
                Math.max(2, Math.min(4, track.module_count))
              );
          const isExpanded = expandedTrackId === track.id;
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
                {track.estimated_hours && <span>{track.estimated_hours} hours</span>}
                {track.difficulty && <span>{track.difficulty}</span>}
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
              {isExpanded && (
                <div className="explore-syllabus-preview">
                  <strong>{track.syllabus_summary ?? "Syllabus preview"}</strong>
                  <div>
                    {(track.learning_outcomes ?? []).slice(0, 3).map((outcome) => (
                      <span key={outcome}>{outcome}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="explore-card-actions">
                <Link href={`/explore/${track.id}`} className="v2-btn sm">
                  Details
                </Link>
                <button
                  type="button"
                  className="v2-btn sm ghost"
                  onClick={() => setExpandedTrackId(isExpanded ? null : track.id)}
                >
                  {isExpanded ? "Hide syllabus" : "Preview syllabus"}
                </button>
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
