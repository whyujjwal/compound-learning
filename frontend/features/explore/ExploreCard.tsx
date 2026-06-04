"use client";

import Link from "next/link";
import type { CatalogTrack } from "@/lib/api";
import { Badge } from "@/components/primitives";
import { Button } from "@/components/primitives";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return null;
  const d = difficulty.toLowerCase();
  const color =
    d === "beginner" || d === "easy"
      ? "success"
      : d === "intermediate" || d === "medium"
        ? "warn"
        : d === "advanced" || d === "hard"
          ? "error"
          : "muted";
  return <Badge color={color}>{difficulty}</Badge>;
}

function StarCount({ count }: { count: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 12,
        color: "var(--muted)",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M6 1L7.54 4.11L11 4.6L8.5 7.05L9.08 10.5L6 8.88L2.92 10.5L3.5 7.05L1 4.6L4.46 4.11L6 1Z"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
          fill={count > 0 ? "currentColor" : "none"}
        />
      </svg>
      {count}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExploreCard({
  track,
  busy,
  onAdopt,
}: {
  track: CatalogTrack;
  busy: boolean;
  onAdopt: (track: CatalogTrack) => void;
}) {
  return (
    <article
      data-testid="explore-card"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--canvas)",
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        padding: "16px 18px",
        gap: 10,
        transition: "background var(--dur-fast)",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--panel)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--canvas)";
      }}
    >
      {/* Top row: featured badge + star count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 20,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {track.is_featured && <Badge color="accent">Featured</Badge>}
        </div>
        <StarCount count={track.star_count} />
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text)",
          lineHeight: 1.35,
          margin: 0,
        }}
      >
        <Link
          href={`/explore/${track.id}`}
          style={{
            color: "inherit",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text)";
          }}
        >
          {track.name}
        </Link>
      </h2>

      {/* Description */}
      {track.description && (
        <p
          style={{
            fontSize: 13,
            color: "var(--muted)",
            lineHeight: 1.55,
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {track.description}
        </p>
      )}

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 2,
        }}
      >
        <DifficultyBadge difficulty={track.difficulty} />

        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {track.material_count} materials
        </span>

        {track.estimated_hours && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {track.estimated_hours}h
          </span>
        )}

        {track.creator_name && (
          <span
            style={{
              fontSize: 12,
              color: "var(--muted)",
              marginLeft: "auto",
            }}
          >
            by {track.creator_name}
          </span>
        )}
      </div>

      {/* Action row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 2,
          paddingTop: 10,
          borderTop: "1px solid var(--hairline)",
        }}
      >
        {track.already_in_library ? (
          <>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "var(--ok)",
                fontWeight: 500,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              In library
            </span>
            <Button
              size="sm"
              variant="ghost"
              style={{ marginLeft: "auto" }}
            >
              <Link
                href={`/library/${track.slug}`}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                Open
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="primary"
              loading={busy}
              disabled={busy}
              onClick={() => onAdopt(track)}
            >
              Add to library
            </Button>
            <Button size="sm" variant="ghost" style={{ marginLeft: "auto" }}>
              <Link
                href={`/explore/${track.id}`}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                Details
              </Link>
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
