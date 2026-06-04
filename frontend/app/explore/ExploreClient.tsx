"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppShell, PageContent } from "@/components/shell";
import { api, type CatalogCollection, type CatalogTrack } from "@/lib/api";
import { filterCatalogTracks, type CatalogSortMode } from "@/lib/catalog-client";
import { ExploreCard } from "@/features/explore/ExploreCard";
import { Button, Input, Badge, EmptyState, Skeleton } from "@/components/primitives";
import { useToast } from "@/components/primitives";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExploreClientProps = {
  initialTracks: CatalogTrack[];
  initialCollections: CatalogCollection[];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 28,
        padding: "0 10px",
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        color: active ? "var(--accent)" : "var(--muted)",
        background: active ? "var(--accent-soft)" : "transparent",
        border: active ? "1px solid transparent" : "1px solid transparent",
        borderRadius: 4,
        cursor: "pointer",
        transition: "color var(--dur-fast), background var(--dur-fast)",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
          (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }
      }}
    >
      {children}
    </button>
  );
}

function CollectionStrip({ collection }: { collection: CatalogCollection }) {
  return (
    <div
      style={{
        borderBottom: "1px solid var(--hairline)",
        paddingBottom: 20,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <h2
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          {collection.title}
        </h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {collection.tracks.length} tracks
        </span>
      </div>

      {collection.description && (
        <p
          style={{
            fontSize: 13,
            color: "var(--muted)",
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          {collection.description}
        </p>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {collection.tracks.slice(0, 6).map((track) => (
          <Link
            key={track.id}
            href={`/explore/${track.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 26,
              padding: "0 10px",
              fontSize: 12,
              color: "var(--text)",
              background: "var(--panel)",
              border: "1px solid var(--hairline)",
              borderRadius: 4,
              textDecoration: "none",
              transition: "border-color var(--dur-fast), background var(--dur-fast)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--hairline)";
              (e.currentTarget as HTMLElement).style.color = "var(--text)";
            }}
          >
            {track.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--hairline)",
            borderRadius: 6,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Skeleton height={12} width="40%" />
          <Skeleton height={16} width="85%" />
          <Skeleton height={12} width="95%" />
          <Skeleton height={12} width="70%" />
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <Skeleton height={22} width={64} borderRadius={3} />
            <Skeleton height={22} width={48} borderRadius={3} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function ExploreClient({
  initialTracks,
  initialCollections,
}: ExploreClientProps) {
  const { push: toastPush } = useToast();
  const [tracks, setTracks] = useState(initialTracks);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CatalogSortMode>("ranking");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading] = useState(false);

  const visibleTracks = useMemo(
    () => filterCatalogTracks(tracks, { q: query, sort, featuredOnly, limit: 80 }),
    [tracks, query, sort, featuredOnly]
  );

  async function adopt(track: CatalogTrack) {
    setBusyId(track.id);
    try {
      const result = await api.adoptCatalogTrack(track.id);
      const refreshed = await api.getCatalogTracks();
      setTracks(refreshed);
      toastPush({
        kind: "success",
        title: "Added to library",
        body: `${track.name} — ${result.materials_created} materials imported.`,
      });
    } catch (err) {
      toastPush({
        kind: "error",
        title: "Could not add track",
        body: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const hasCollections = initialCollections.length > 0;
  const hasQuery = Boolean(query) || featuredOnly;

  return (
    <PageContent style={{ paddingTop: 40, paddingBottom: 64 }}>
      {/* ── Page header ───────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 28,
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 6,
            }}
          >
            Explore
          </p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
            }}
          >
            Community tracks
          </h1>
          <p
            style={{
              marginTop: 6,
              fontSize: 14,
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            Browse and add community-built learning tracks to your library.
          </p>
        </div>

        <Button variant="primary" size="md" style={{ flexShrink: 0, marginTop: 4 }}>
          <Link
            href="/library/new"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Create a track
          </Link>
        </Button>
      </div>

      {/* ── Collections (shown when no query active) ────── */}
      {hasCollections && !hasQuery && (
        <div style={{ marginBottom: 28 }}>
          {initialCollections.slice(0, 3).map((col) => (
            <CollectionStrip key={col.id} collection={col} />
          ))}
        </div>
      )}

      {/* ── Search + filters ────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks…"
            aria-label="Search catalog"
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "2px 3px",
            background: "var(--panel)",
            border: "1px solid var(--hairline)",
            borderRadius: 5,
          }}
        >
          <FilterButton active={sort === "ranking" && !featuredOnly} onClick={() => { setSort("ranking"); setFeaturedOnly(false); }}>
            Top
          </FilterButton>
          <FilterButton active={sort === "new"} onClick={() => { setSort("new"); setFeaturedOnly(false); }}>
            New
          </FilterButton>
          <FilterButton active={sort === "stars"} onClick={() => { setSort("stars"); setFeaturedOnly(false); }}>
            Stars
          </FilterButton>
          <FilterButton active={featuredOnly} onClick={() => setFeaturedOnly((v) => !v)}>
            Featured
          </FilterButton>
        </div>

        {visibleTracks.length > 0 && (
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>
            {visibleTracks.length} track{visibleTracks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Divider ─────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--hairline)",
          marginBottom: 20,
        }}
      />

      {/* ── Grid / States ───────────────────────────────── */}
      {loading ? (
        <GridSkeleton />
      ) : visibleTracks.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M17 17l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          title={hasQuery ? "No tracks match your search" : "No tracks available yet"}
          description={
            hasQuery
              ? "Try a different term, or clear filters to browse everything."
              : "Tracks published by the community will appear here."
          }
          action={
            hasQuery ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setQuery(""); setFeaturedOnly(false); }}
              >
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" size="sm">
                <Link href="/library/new" style={{ color: "inherit", textDecoration: "none" }}>
                  Create your first track
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {visibleTracks.map((track) => (
            <ExploreCard
              key={track.id}
              track={track}
              busy={busyId === track.id}
              onAdopt={adopt}
            />
          ))}
        </div>
      )}
    </PageContent>
  );
}
