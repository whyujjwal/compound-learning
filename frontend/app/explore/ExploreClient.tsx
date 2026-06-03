"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { api, type CatalogCollection, type CatalogTrack } from "@/lib/api";
import { filterCatalogTracks, type CatalogSortMode } from "@/lib/catalog-client";
import { ExploreCard } from "@/features/explore/ExploreCard";

type ExploreClientProps = {
  initialTracks: CatalogTrack[];
  initialCollections: CatalogCollection[];
};

export function ExploreClient({
  initialTracks,
  initialCollections,
}: ExploreClientProps) {
  const { reloadAll } = useShell();
  const [tracks, setTracks] = useState(initialTracks);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CatalogSortMode>("ranking");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const visibleTracks = useMemo(
    () => filterCatalogTracks(tracks, { q: query, sort, featuredOnly, limit: 80 }),
    [tracks, query, sort, featuredOnly]
  );

  async function adopt(track: CatalogTrack) {
    setBusyId(track.id);
    setMessage(null);
    try {
      const result = await api.adoptCatalogTrack(track.id);
      await reloadAll();
      const refreshed = await api.getCatalogTracks();
      setTracks(refreshed);
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
          <h1 className="explore-title">Browse community roadmaps</h1>
          <p className="explore-sub">
            Browse community roadmaps and add the ones you want to your library.
          </p>
        </div>
        <Link href="/library/new" className="v2-btn primary">
          Create a syllabus
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
            Top
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

      {visibleTracks.length === 0 && (
        <section className="empty-today">
          <h2 className="empty-today-title">No public tracks found.</h2>
          <p className="empty-today-sub">
            {query || featuredOnly
              ? "Try a different search or clear filters."
              : "Create a syllabus with AI and publish it when you are ready to share."}
          </p>
          {!query && !featuredOnly && (
            <Link href="/library/new" className="v2-btn primary" style={{ marginTop: 12 }}>
              New syllabus
            </Link>
          )}
        </section>
      )}

      <div className="explore-grid">
        {visibleTracks.map((track) => (
          <ExploreCard key={track.id} track={track} busy={busyId === track.id} onAdopt={adopt} />
        ))}
      </div>
    </>
  );
}
