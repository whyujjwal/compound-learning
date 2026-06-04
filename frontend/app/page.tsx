"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppShell, PageContent } from "@/components/shell";
import { useDailyQueue, useStats } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { QueueItem } from "@/lib/api/types";
import { getLocalDateKey } from "@/lib/time";
import { getCompletedSlots } from "@/lib/dailyProgress";
import { Button, EmptyState, Skeleton } from "@/components/primitives";

import { TodayStats } from "@/features/home/TodayStats";
import { QueueBlock } from "@/features/home/QueueBlock";
import { ActivityStrip } from "@/features/home/ActivityStrip";
import { CoachPanel } from "@/features/home/CoachPanel";

function dateLabel(): { weekday: string; date: string } {
  const d = new Date();
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    date: d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    }),
  };
}

export default function HomePage() {
  const { setRightPanel } = useAppShell();
  const router = useRouter();

  const { data: queue, isLoading: queueLoading } = useDailyQueue();
  const { data: stats, isLoading: statsLoading } = useStats();

  const [extraByTrack, setExtraByTrack] = useState<Record<string, QueueItem[]>>({});
  const autoStarted = useRef(false);

  // Register coach in the right panel
  useEffect(() => {
    setRightPanel(<CoachPanel />);
    return () => setRightPanel(null);
  }, [setRightPanel]);

  // Push more items for a track
  const handlePushMore = useCallback(
    async (slug: string) => {
      const block = queue?.blocks.find((b) => b.track_slug === slug);
      const already = new Set<string>();
      if (block) {
        for (const it of block.reviews) already.add(it.card_id);
        for (const it of block.new_items) already.add(it.card_id);
      }
      for (const it of extraByTrack[slug] ?? []) already.add(it.card_id);
      try {
        const more = await api.getExtraQueue(slug, 5, Array.from(already));
        setExtraByTrack((prev) => ({
          ...prev,
          [slug]: [...(prev[slug] ?? []), ...more],
        }));
      } catch {
        // tolerate
      }
    },
    [queue, extraByTrack]
  );

  const blocks = queue?.blocks ?? [];
  const activeBlocks = blocks.filter(
    (b) =>
      b.reviews.length +
        b.new_items.length +
        (extraByTrack[b.track_slug]?.length ?? 0) >
      0
  );

  // Completed blocks: we track completed by checking block session state.
  // For now we mirror the original logic: use localStorage slots.
  const [completedSlots, setCompletedSlots] = useState<number[]>([]);

  useEffect(() => {
    // Read completed slots from the same key that markBlockComplete writes:
    // lib/dailyProgress → KEY = "compound:daily-progress" → { date, completedSlots }
    try {
      setCompletedSlots(getCompletedSlots());
    } catch {
      // ignore
    }
  }, [queue]);

  const firstOpenBlock = activeBlocks.find(
    (b) => !completedSlots.includes(b.slot)
  ) ?? activeBlocks[0];
  const allDone =
    activeBlocks.length > 0 &&
    activeBlocks.every((b) => completedSlots.includes(b.slot));

  // Auto-start: once per day, land directly in practice
  useEffect(() => {
    if (autoStarted.current || !queue || !firstOpenBlock || allDone) return;
    if (typeof window === "undefined") return;
    const day = getLocalDateKey();
    if (window.localStorage.getItem(`compound:auto-started-${day}`)) return;
    if (window.sessionStorage.getItem("compound:skip-auto-start")) {
      window.sessionStorage.removeItem("compound:skip-auto-start");
      return;
    }
    autoStarted.current = true;
    window.localStorage.setItem(`compound:auto-started-${day}`, "1");
    router.push(`/block/${firstOpenBlock.slot}`);
  }, [queue, firstOpenBlock, allDone, router]);

  const { weekday, date } = dateLabel();

  return (
    <PageContent
      style={{ paddingTop: 40, paddingBottom: 64 }}
    >
      {/* ── Page heading ──────────────────────────────────── */}
      <header style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: 12,
            color: "var(--muted)",
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {date}
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
          }}
        >
          {weekday}
        </h1>
      </header>

      {/* ── Stat strip ────────────────────────────────────── */}
      <TodayStats
        stats={stats}
        queue={queue}
        statsLoading={statsLoading}
        queueLoading={queueLoading}
      />

      {/* ── Today's queue ─────────────────────────────────── */}
      <section aria-label="Today's queue">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            gap: 12,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--muted)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Today&apos;s queue
          </h2>

          {activeBlocks.length > 0 && firstOpenBlock && !allDone && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/block/${firstOpenBlock.slot}`)}
            >
              Start session
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 6H10M7 3L10 6L7 9"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          )}
        </div>

        {/* Loading state */}
        {queueLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 64,
                  borderRadius: 6,
                  border: "1px solid var(--hairline)",
                  overflow: "hidden",
                }}
              >
                <Skeleton height="100%" borderRadius={0} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!queueLoading && blocks.length === 0 && (
          <EmptyState
            icon={
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden
              >
                <rect
                  x="4"
                  y="6"
                  width="24"
                  height="20"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M4 12h24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M10 18h12M10 22h8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
            title="Your canvas is empty"
            description="Create tracks from scratch, generate a personalized roadmap, or import example tracks to get started."
            action={
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Button variant="primary" size="md">
                  <Link
                    href="/curriculum/build"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    Build my roadmap
                  </Link>
                </Button>
                <p style={{ fontSize: 13, color: "var(--muted)" }}>
                  Or open the{" "}
                  <Link
                    href="/curriculum"
                    style={{ color: "var(--accent)", textDecoration: "none" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                    }}
                  >
                    roadmap canvas
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/schedule"
                    style={{ color: "var(--accent)", textDecoration: "none" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                    }}
                  >
                    weekly calendar
                  </Link>
                </p>
              </div>
            }
          />
        )}

        {/* All done banner */}
        {!queueLoading && allDone && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 6,
              background: "rgba(15, 123, 108, 0.06)",
              border: "1px solid rgba(15, 123, 108, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden
            >
              <circle cx="9" cy="9" r="8" stroke="var(--ok)" strokeWidth="1.5" />
              <path
                d="M5.5 9L7.5 11L12.5 6.5"
                stroke="var(--ok)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--ok)",
                }}
              >
                All {activeBlocks.length} block
                {activeBlocks.length !== 1 ? "s" : ""} complete
              </p>
              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 1 }}>
                Great work today. Come back tomorrow for more.
              </p>
            </div>
          </div>
        )}

        {/* Block list */}
        {!queueLoading && blocks.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {blocks.map((block, i) => (
              <QueueBlock
                key={block.slot}
                block={block}
                extra={extraByTrack[block.track_slug] ?? []}
                completed={completedSlots.includes(block.slot)}
                onPushMore={handlePushMore}
                isFirst={i === 0 && !completedSlots.includes(block.slot)}
              />
            ))}
          </div>
        )}

        {/* Stats breakdown when queue is loaded */}
        {!queueLoading && blocks.length > 0 && (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {activeBlocks.length} track{activeBlocks.length !== 1 ? "s" : ""}
              {" · "}
              {queue?.review_count ?? 0} reviews
              {" · "}
              {queue?.new_count ?? 0} new
              {" · "}
              ~{queue?.total_minutes ?? 0}m total
            </span>
            <Link
              href="/library"
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                transition: "color var(--dur-fast)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              Library
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 6H10M7 3L10 6L7 9"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        )}
      </section>

      {/* ── Activity heatmap ───────────────────────────────── */}
      <ActivityStrip />
    </PageContent>
  );
}
