"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { trackAccent } from "@/lib/trackColors";
import { api, type BlockEntry, type QueueItem } from "@/lib/api";
import {
  countCompleted,
  getCompletedSlots,
  isBlockComplete,
} from "@/lib/dailyProgress";
import { getLocalDateKey } from "@/lib/time";
import { HomeCoach } from "@/features/home/HomeCoach";

function dateLabel(): { day: string; meta: string } {
  const d = new Date();
  return {
    day: d.toLocaleDateString("en-US", { weekday: "long" }),
    meta: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
}

export default function HomePage() {
  const shell = useShell();
  const router = useRouter();
  const { queue, stats, tracks, setActions } = shell;

  const [extraByTrack, setExtraByTrack] = useState<Record<string, QueueItem[]>>({});
  const [completedSlots, setCompletedSlots] = useState<number[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    setCompletedSlots(getCompletedSlots());
  }, [queue, stats]);

  // ── Block actions ────────────────────────────────────────
  const startBlock = useCallback(
    (block: BlockEntry) => {
      router.push(`/block/${block.slot}`);
    },
    [router]
  );

  const pushMore = useCallback(
    async (slug: string) => {
      const block = queue?.blocks.find((b) => b.track_slug === slug);
      try {
        const already = new Set<string>();
        if (block) {
          for (const it of block.reviews) already.add(it.card_id);
          for (const it of block.new_items) already.add(it.card_id);
        }
        for (const it of extraByTrack[slug] ?? []) already.add(it.card_id);
        const more = await api.getExtraQueue(slug, 5, Array.from(already));
        setExtraByTrack((prev) => ({
          ...prev,
          [slug]: [...(prev[slug] ?? []), ...more],
        }));
      } catch {
        // tolerate failure
      }
    },
    [queue, extraByTrack]
  );

  // ── Expose actions to command palette ────────────────────
  useEffect(() => {
    setActions({
      onPushMore: pushMore,
      onStartFirstBlock: () => {
        const block = queue?.blocks.find(
          (b) => b.reviews.length + b.new_items.length > 0
        );
        if (block) startBlock(block);
      },
    });
    return () => setActions({});
  }, [setActions, pushMore, queue, startBlock]);

  const date = dateLabel();
  const blocks = queue?.blocks ?? [];
  const activeBlocks = blocks.filter(
    (b) => b.reviews.length + b.new_items.length + (extraByTrack[b.track_slug]?.length ?? 0) > 0
  );
  const blocksDone = countCompleted(blocks.map((b) => b.slot));
  const firstOpenBlock = activeBlocks.find((b) => !isBlockComplete(b.slot)) ?? activeBlocks[0];
  const allBlocksDone = activeBlocks.length > 0 && blocksDone >= activeBlocks.length;
  const autoStarted = useRef(false);

  // Once per day: open Home → land in practice immediately.
  useEffect(() => {
    if (autoStarted.current || !queue || !firstOpenBlock || allBlocksDone) return;
    if (typeof window === "undefined") return;
    const day = getLocalDateKey();
    if (window.localStorage.getItem(`compound:auto-started-${day}`)) return;
    if (window.sessionStorage.getItem("compound:skip-auto-start")) {
      window.sessionStorage.removeItem("compound:skip-auto-start");
      return;
    }
    autoStarted.current = true;
    window.localStorage.setItem(`compound:auto-started-${day}`, "1");
    startBlock(firstOpenBlock);
  }, [queue, firstOpenBlock, allBlocksDone, startBlock]);

  const streak = stats?.current_streak ?? 0;
  const blocksDoneDisplay = `${blocksDone}/${activeBlocks.length || "—"}`;
  const retention = stats ? Math.round((stats.retention_rate || 0) * 100) : null;

  return (
    <div className="home-page">
      {/* ── Section 1: Header ───────────────────────────── */}
      <header className="home-header">
        <div className="home-header-main">
          <p className="home-eyebrow">{date.meta}</p>
          <h1 className="home-title">{date.day}</h1>
        </div>
        <div className="home-header-strip">
          <div className="home-strip-stat" title="Current streak">
            <strong>{streak}</strong>
            <span>day streak</span>
          </div>
          <div className="home-strip-sep" aria-hidden />
          <div className="home-strip-stat" title="Blocks completed today">
            <strong>{blocksDoneDisplay}</strong>
            <span>blocks today</span>
          </div>
          {retention !== null && (
            <>
              <div className="home-strip-sep" aria-hidden />
              <div className="home-strip-stat" title="Overall retention rate">
                <strong>{retention}%</strong>
                <span>retention</span>
              </div>
            </>
          )}
          <div className="home-strip-sep" aria-hidden />
          <Link href="/profile" className="home-strip-link">
            View profile →
          </Link>
        </div>
      </header>

      {/* ── Section 2: Today's target ───────────────────── */}
      <section className="home-target">
        <h2 className="home-section-title">Today&apos;s target</h2>

        {blocks.length === 0 ? (
          <div className="empty-today">
            <h3 className="empty-today-title">Your canvas is empty.</h3>
            <p className="empty-today-sub">
              Create tracks from scratch, generate a personalized roadmap, or import
              example tracks to get started.
            </p>
            <Link href="/curriculum/build" className="v2-btn primary" style={{ marginTop: 12 }}>
              Build my roadmap →
            </Link>
            <p className="empty-today-sub" style={{ marginTop: 10, fontSize: 12 }}>
              Or open the <Link href="/curriculum">roadmap canvas</Link> and{" "}
              <Link href="/schedule">weekly calendar</Link>.
            </p>
          </div>
        ) : (
          <>
            {firstOpenBlock && !allBlocksDone && (
              <BlockChecklistPreview
                block={firstOpenBlock}
                onOpen={() => startBlock(firstOpenBlock)}
              />
            )}

            {allBlocksDone && (
              <div className="home-all-done">
                All {activeBlocks.length} block{activeBlocks.length === 1 ? "" : "s"} done for today.
                Great work.
              </div>
            )}

            <button
              type="button"
              className="today-schedule-toggle"
              onClick={() => setShowSchedule((v) => !v)}
              aria-expanded={showSchedule}
            >
              {showSchedule
                ? "Hide schedule"
                : `Full schedule · ${activeBlocks.length} block${activeBlocks.length === 1 ? "" : "s"}`}
              <span aria-hidden>{showSchedule ? " ▾" : " ▸"}</span>
            </button>

            {showSchedule && (
              <div className="today-blocks">
                {blocks.map((block) => (
                  <BlockRow
                    key={block.slot}
                    block={block}
                    extra={extraByTrack[block.track_slug] ?? []}
                    completed={completedSlots.includes(block.slot)}
                    onStart={() => startBlock(block)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Section 3: AI Coach ─────────────────────────── */}
      <HomeCoach />
    </div>
  );
}

function BlockChecklistPreview({
  block,
  onOpen,
}: {
  block: BlockEntry;
  onOpen: () => void;
}) {
  const accent = trackAccent(block.track_slug, block.track_color);
  const items = [...block.reviews, ...block.new_items];

  return (
    <section className="block-preview" style={{ ["--track-color" as string]: accent }}>
      <div className="block-preview-head">
        <div>
          <p className="block-preview-eyebrow">
            {block.slot_label} · ~{block.planned_minutes}m
          </p>
          <h2 className="block-preview-title">{block.track_name}</h2>
        </div>
        <button type="button" className="v2-btn primary" onClick={onOpen}>
          Open block →
        </button>
      </div>
      <ol className="block-preview-list">
        {items.map((item, i) => (
          <li key={item.card_id} className="block-preview-item">
            <span className="block-preview-num">{i + 1}</span>
            <span className="block-preview-item-title">{item.material_title}</span>
            <span className="block-preview-item-meta">{item.estimated_minutes}m</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BlockRow({
  block,
  extra,
  completed,
  onStart,
}: {
  block: BlockEntry;
  extra: QueueItem[];
  completed: boolean;
  onStart: () => void;
}) {
  const accent = trackAccent(block.track_slug, block.track_color);
  const allItems = [...block.reviews, ...block.new_items, ...extra];
  const next = allItems[0];
  const remaining = Math.max(allItems.length - 1, 0);
  const isEmpty = allItems.length === 0;

  return (
    <article
      className={`block-row${isEmpty ? " empty" : ""}${completed ? " done" : ""}`}
      style={{ ["--track-color" as string]: accent }}
    >
      <div className="block-row-main">
        <div className="block-row-eyebrow">
          {completed && <span className="block-row-check" aria-label="Completed">✓</span>}
          <span className="slot">{block.slot_label}</span>
          <span className="sep">·</span>
          <span>{block.track_name}</span>
        </div>
        {next ? (
          <div className="block-row-next" title={next.material_title}>
            <span className="muted">Next ·</span> {next.material_title}
          </div>
        ) : (
          <div className="block-row-next muted">Nothing queued.</div>
        )}
        <div className="block-row-meta">
          {block.reviews.length > 0 && (
            <span>
              <strong>{block.reviews.length}</strong> review
              {block.reviews.length === 1 ? "" : "s"}
            </span>
          )}
          <span>
            <strong>{block.new_items.length + extra.length}</strong> new
          </span>
          {remaining > 0 && <span>+{remaining} more</span>}
          <span>~{block.planned_minutes}m</span>
        </div>
      </div>
      <div className="block-row-actions">
        <button
          type="button"
          className="v2-btn block-row-start"
          onClick={onStart}
          disabled={isEmpty}
        >
          {completed ? "Again" : "Open"} <span aria-hidden>›</span>
        </button>
      </div>
    </article>
  );
}
