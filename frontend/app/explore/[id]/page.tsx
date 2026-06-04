"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppShell, PageContent } from "@/components/shell";
import {
  Button,
  Badge,
  Skeleton,
  EmptyState,
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from "@/components/primitives";
import { useToast } from "@/components/primitives";
import {
  useCatalogTrack,
  useAdoptCatalogTrack,
  useStarCatalogTrack,
  useUnstarCatalogTrack,
  useRateCatalogTrack,
} from "@/lib/hooks";
import type { CatalogTrackDetail, SyllabusMaterial } from "@/lib/api";

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function MetaRow({
  items,
}: {
  items: Array<{ label: string; value: string | number | null | undefined }>;
}) {
  const visible = items.filter((i) => i.value !== null && i.value !== undefined);
  if (!visible.length) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0 20px",
      }}
    >
      {visible.map(({ label, value }) => (
        <div
          key={label}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {label}
          </span>
          <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--hairline)", margin: "0" }} />;
}

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

// ─── Star button ──────────────────────────────────────────────────────────────

function StarButton({
  starred,
  count,
  loading,
  onClick,
}: {
  starred: boolean;
  count: number;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={starred ? "Unstar track" : "Star track"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 34,
        padding: "0 12px",
        fontSize: 13,
        fontWeight: 500,
        color: starred ? "var(--warn)" : "var(--muted)",
        background: "transparent",
        border: "1px solid var(--hairline)",
        borderRadius: 4,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.5 : 1,
        transition: "color var(--dur-fast), background var(--dur-fast)",
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--warn)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = starred ? "var(--warn)" : "var(--muted)";
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M7 1.5L8.8 5.1L13 5.7L10 8.6L10.7 12.8L7 10.9L3.3 12.8L4 8.6L1 5.7L5.2 5.1L7 1.5Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          fill={starred ? "currentColor" : "none"}
        />
      </svg>
      {starred ? "Starred" : "Star"}
      {count > 0 && (
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 1 }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Rating widget ────────────────────────────────────────────────────────────

function RatingWidget({
  currentAvg,
  ratingCount,
  onRate,
  busy,
}: {
  currentAvg: number;
  ratingCount: number;
  onRate: (n: number) => void;
  busy: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  function handleRate(n: number) {
    setSelected(n);
    onRate(n);
  }

  const display = hovered || selected || currentAvg;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        background: "var(--panel)",
        border: "1px solid var(--hairline)",
        borderRadius: 6,
      }}
    >
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => handleRate(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`Rate ${n} out of 5`}
            style={{
              width: 24,
              height: 24,
              background: "transparent",
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
              color: n <= (hovered || selected || Math.round(currentAvg)) ? "var(--warn)" : "var(--hairline)",
              transition: "color var(--dur-fast)",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M8 2L9.8 5.6L14 6.2L11 9.1L11.7 13.3L8 11.4L4.3 13.3L5 9.1L2 6.2L6.2 5.6L8 2Z"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
                fill={n <= (hovered || selected || Math.round(currentAvg)) ? "currentColor" : "none"}
              />
            </svg>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: "var(--muted)" }}>
        {selected > 0 ? (
          <span style={{ color: "var(--ok)" }}>Rating saved — thanks!</span>
        ) : ratingCount > 0 ? (
          <span>
            {currentAvg.toFixed(1)} avg from {ratingCount} rating{ratingCount !== 1 ? "s" : ""}
          </span>
        ) : (
          <span>Be the first to rate</span>
        )}
      </div>
    </div>
  );
}

// ─── Module accordion item ────────────────────────────────────────────────────

function ModuleRow({
  module,
  defaultOpen,
}: {
  module: CatalogTrackDetail["modules"][number];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "12px 14px",
          background: open ? "var(--panel)" : "var(--canvas)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background var(--dur-fast)",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--canvas)";
          }
        }}
      >
        {/* Chevron */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: 16,
            height: 20,
            color: "var(--muted)",
            transition: "transform var(--dur-fast)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              {module.title}
            </span>
            <DifficultyBadge difficulty={module.difficulty} />
          </div>
          {module.objective && (
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2, lineHeight: 1.5 }}>
              {module.objective}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {module.material_count} materials
            </span>
            {module.estimated_minutes > 0 && (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                ~{Math.round(module.estimated_minutes / 60 * 10) / 10}h
              </span>
            )}
          </div>
        </div>
      </button>

      {open && module.materials.length > 0 && (
        <div style={{ borderTop: "1px solid var(--hairline)" }}>
          {module.materials.map((material, idx) => (
            <MaterialRow key={material.id} material={material} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Material row ─────────────────────────────────────────────────────────────

function MaterialRow({
  material,
  index,
}: {
  material: SyllabusMaterial;
  index: number;
}) {
  const isLink = Boolean(material.external_url);
  const Content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px 9px 40px",
        borderBottom: "1px solid var(--hairline)",
        transition: "background var(--dur-fast)",
      }}
    >
      {/* Index */}
      <span
        style={{
          flexShrink: 0,
          width: 18,
          height: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--muted)",
          background: "var(--overlay-hover)",
          borderRadius: 3,
        }}
      >
        {index + 1}
      </span>

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: isLink ? "var(--text)" : "var(--text)",
          lineHeight: 1.4,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {material.title}
      </span>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {material.resource_type && (
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize" }}>
            {material.resource_type}
          </span>
        )}
        {material.estimated_minutes > 0 && (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>
            {material.estimated_minutes}m
          </span>
        )}
        {isLink && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden style={{ color: "var(--muted)", opacity: 0.6 }}>
            <path d="M5.5 1.5H8.5V4.5M4 6L8.5 1.5M1.5 3H4.5V8.5H1.5V3Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );

  if (isLink) {
    return (
      <a
        href={material.external_url!}
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: "none", display: "block" }}
        onMouseEnter={(e) => {
          const inner = e.currentTarget.querySelector("div") as HTMLElement | null;
          if (inner) inner.style.background = "var(--overlay-hover)";
        }}
        onMouseLeave={(e) => {
          const inner = e.currentTarget.querySelector("div") as HTMLElement | null;
          if (inner) inner.style.background = "transparent";
        }}
      >
        {Content}
      </a>
    );
  }
  return Content;
}

// ─── Flat materials list ──────────────────────────────────────────────────────

function AllMaterialsList({ materials }: { materials: CatalogTrackDetail["materials"] }) {
  if (!materials.length) {
    return (
      <EmptyState
        title="No materials yet"
        description="This track's materials will appear here once available."
      />
    );
  }
  return (
    <div
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {materials.map((material, idx) => (
        <div
          key={material.id}
          style={{ borderBottom: idx < materials.length - 1 ? "1px solid var(--hairline)" : "none" }}
        >
          <MaterialRow
            material={{
              id: material.id,
              module_id: material.module_id,
              title: material.title,
              external_url: material.external_url,
              resource_type: material.resource_type,
              estimated_minutes: material.estimated_minutes,
              sequence: material.sequence,
              difficulty: material.difficulty,
              resource_quality_score: material.resource_quality_score,
              resource_health_status: material.resource_health_status,
            }}
            index={idx}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <PageContent style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
        <Skeleton width={60} height={12} />
        <Skeleton width={12} height={12} borderRadius="50%" />
        <Skeleton width={120} height={12} />
      </div>
      <Skeleton height={28} width="60%" style={{ marginBottom: 12 }} />
      <Skeleton height={16} width="90%" style={{ marginBottom: 6 }} />
      <Skeleton height={16} width="75%" style={{ marginBottom: 28 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <Skeleton height={34} width={130} borderRadius={4} />
        <Skeleton height={34} width={80} borderRadius={4} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
        {[80, 60, 70, 55].map((w, i) => (
          <Skeleton key={i} height={40} width={w} borderRadius={4} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={58} borderRadius={6} />
        ))}
      </div>
    </PageContent>
  );
}

// ─── Right panel content ──────────────────────────────────────────────────────

function TrackSidePanel({ track }: { track: CatalogTrackDetail }) {
  return (
    <div
      style={{
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Quality signals */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--muted)",
            marginBottom: 10,
          }}
        >
          Quality signals
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Quality score", value: `${Math.round(track.quality_score)}/100` },
            { label: "Stars", value: track.star_count },
            { label: "Adoptions", value: track.adoption_count },
            { label: "Rating", value: track.rating_count > 0 ? `${track.rating_avg.toFixed(1)} / 5` : "—" },
            { label: "Quizzes", value: track.quality.quiz_count },
            { label: "Projects", value: track.quality.project_count },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "4px 0",
                borderBottom: "1px solid var(--hairline)",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Creator */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--muted)",
            marginBottom: 10,
          }}
        >
          Creator
        </p>
        <Link
          href={`/creator/${track.creator_id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          View creator profile
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Prerequisites */}
      {track.prerequisites && track.prerequisites.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--muted)",
              marginBottom: 8,
            }}
          >
            Prerequisites
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: 4, listStyle: "none" }}>
            {track.prerequisites.map((p) => (
              <li
                key={p}
                style={{
                  fontSize: 13,
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                }}
              >
                <span style={{ color: "var(--muted)", flexShrink: 0, marginTop: 2 }}>—</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublicTrackDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const { setRightPanel } = useAppShell();
  const { push: toastPush } = useToast();

  const { data: track, isLoading, error } = useCatalogTrack(id);

  const adoptMut = useAdoptCatalogTrack();
  const starMut = useStarCatalogTrack();
  const unstarMut = useUnstarCatalogTrack();
  const rateMut = useRateCatalogTrack();

  const isBusy =
    adoptMut.isPending ||
    starMut.isPending ||
    unstarMut.isPending ||
    rateMut.isPending;

  // Wire right panel
  useEffect(() => {
    if (track) {
      setRightPanel(<TrackSidePanel track={track} />);
    } else {
      setRightPanel(null);
    }
    return () => setRightPanel(null);
  }, [track, setRightPanel]);

  async function handleAdopt() {
    if (!track) return;
    try {
      const result = await adoptMut.mutateAsync({ id: track.id });
      toastPush({
        kind: "success",
        title: "Added to your library",
        body: `${track.name} — ${result.materials_created} materials imported.`,
      });
      router.push(`/library/${result.slug}`);
    } catch (err) {
      toastPush({
        kind: "error",
        title: "Could not add track",
        body: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  async function handleToggleStar() {
    if (!track) return;
    try {
      if (track.is_starred) {
        await unstarMut.mutateAsync({ id: track.id });
      } else {
        await starMut.mutateAsync({ id: track.id });
      }
    } catch {
      toastPush({ kind: "error", title: "Could not update star" });
    }
  }

  async function handleRate(rating: number) {
    if (!track) return;
    try {
      await rateMut.mutateAsync({ id: track.id, rating });
    } catch {
      toastPush({ kind: "error", title: "Could not save rating" });
    }
  }

  // ── Loading state ────────────────────────────────────────
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // ── Error / not found ────────────────────────────────────
  if (error || !track) {
    return (
      <PageContent style={{ paddingTop: 60 }}>
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          title="Track not found"
          description={
            error instanceof Error
              ? error.message
              : "This track may have been removed or made private."
          }
          action={
            <Button variant="secondary" size="sm" onClick={() => router.back()}>
              Go back
            </Button>
          }
        />
      </PageContent>
    );
  }

  const modules = track.modules ?? [];
  const outcomes = track.learning_outcomes?.length
    ? track.learning_outcomes
    : track.description
      ? [track.description]
      : [];

  return (
    <PageContent style={{ paddingTop: 40, paddingBottom: 60 }}>

      {/* ── Breadcrumb ───────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 24,
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        <Link
          href="/explore"
          style={{
            color: "var(--muted)",
            textDecoration: "none",
            transition: "color var(--dur-fast)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
        >
          Explore
        </Link>
        <span style={{ opacity: 0.4 }}>/</span>
        <span
          style={{
            color: "var(--text)",
            maxWidth: 300,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {track.name}
        </span>
      </div>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        {/* Badges row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <Badge color="muted">Public track</Badge>
          <DifficultyBadge difficulty={track.difficulty} />
          {track.is_featured && <Badge color="accent">Featured</Badge>}
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.2,
            marginBottom: 10,
          }}
        >
          {track.name}
        </h1>

        {track.description && (
          <p
            style={{
              fontSize: 15,
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: 18,
              maxWidth: 680,
            }}
          >
            {track.description}
          </p>
        )}

        {/* Quick meta */}
        <MetaRow
          items={[
            { label: "Materials", value: track.material_count },
            { label: "Modules", value: track.module_count },
            { label: "Hours", value: track.estimated_hours ?? null },
            { label: "Creator", value: track.creator_name ?? null },
          ]}
        />
      </div>

      <Divider />

      {/* ── Primary actions ──────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 20,
          paddingBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {track.already_in_library ? (
          <>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ok)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              In your library
            </span>
            <Button variant="secondary" size="md">
              <Link
                href={`/library/${track.slug}`}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                Open in library
              </Link>
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="md"
            loading={adoptMut.isPending}
            disabled={isBusy}
            onClick={handleAdopt}
          >
            Add to my library
          </Button>
        )}

        <StarButton
          starred={track.is_starred}
          count={track.star_count}
          loading={starMut.isPending || unstarMut.isPending}
          onClick={handleToggleStar}
        />

        <Button variant="ghost" size="md">
          <Link
            href="/library/new"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Remix
          </Link>
        </Button>
      </div>

      <Divider />

      {/* ── What you'll learn ───────────────────────────── */}
      {outcomes.length > 0 && (
        <div style={{ paddingTop: 24, paddingBottom: 24 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 12,
            }}
          >
            What you&apos;ll learn
          </h2>
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 8,
              listStyle: "none",
            }}
          >
            {outcomes.slice(0, 6).map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--text)",
                  lineHeight: 1.5,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                  style={{ flexShrink: 0, marginTop: 2, color: "var(--ok)" }}
                >
                  <path
                    d="M2 7l3.5 3.5L12 3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {outcomes.length > 0 && <Divider />}

      {/* ── Rating widget ────────────────────────────────── */}
      <div style={{ paddingTop: 20, paddingBottom: 20 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 10,
          }}
        >
          Rate this track
        </h2>
        <RatingWidget
          currentAvg={track.rating_avg}
          ratingCount={track.rating_count}
          onRate={handleRate}
          busy={rateMut.isPending}
        />
      </div>

      <Divider />

      {/* ── Syllabus / Materials tabs ────────────────────── */}
      <div style={{ paddingTop: 20 }}>
        <Tabs defaultTab="syllabus">
          <TabList style={{ marginBottom: 20 }}>
            <Tab id="syllabus">Syllabus</Tab>
            <Tab id="materials">All materials</Tab>
          </TabList>

          <TabPanel id="syllabus">
            {modules.length === 0 ? (
              <EmptyState
                title="No modules"
                description="This track doesn't have a module breakdown yet."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {modules.map((module, idx) => (
                  <ModuleRow
                    key={module.id}
                    module={module}
                    defaultOpen={idx < 2}
                  />
                ))}
              </div>
            )}
          </TabPanel>

          <TabPanel id="materials">
            <AllMaterialsList materials={track.materials} />
          </TabPanel>
        </Tabs>
      </div>

    </PageContent>
  );
}
