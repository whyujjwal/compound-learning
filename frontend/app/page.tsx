"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ReviewSession } from "@/components/ReviewSession";
import { Heatmap } from "@/components/Heatmap";
import { Skeleton, SkeletonText } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { resourceAction } from "@/lib/resourceAction";
import {
  api,
  type BlockEntry,
  type CoachInsight,
  type DailyQueue,
  type QueueItem,
  type Stats,
} from "@/lib/api";

function nextDueLabel(seconds: number): string {
  if (seconds < 60) return "in a moment";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `in ${days}d`;
  const months = Math.round(days / 30);
  return `in ${months}mo`;
}

function todayDateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type SessionState = {
  blockSlot: number;
  items: QueueItem[];
  index: number;
};

export default function HomePage() {
  const [queue, setQueue] = useState<DailyQueue | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<{ date: string; count: number }[]>([]);
  const [nudge, setNudge] = useState<CoachInsight | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [extraByTrack, setExtraByTrack] = useState<Record<string, QueueItem[]>>({});
  const [pushingTrack, setPushingTrack] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, s, act] = await Promise.all([
        api.getDailyQueue(),
        api.getStats(),
        api.getActivity(112),
      ]);
      setQueue(q);
      setStats(s);
      setActivity(act);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Nudge: fetch lazily; honor per-day dismiss
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof window !== "undefined") {
      const dismissed = window.localStorage.getItem("compound:nudge-dismiss");
      if (dismissed === today) {
        setNudgeDismissed(true);
        return;
      }
    }
    let cancelled = false;
    api
      .getDailyInsight()
      .then((n) => {
        if (!cancelled) setNudge(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissNudge = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("compound:nudge-dismiss", today);
    }
    setNudgeDismissed(true);
  }, []);

  const handleReviewComplete = useCallback(
    async (rating: string, nextDueSeconds: number, materialTitle: string) => {
      toast.push({
        kind: rating === "AGAIN" ? "warn" : "success",
        title: `${capitalize(rating.toLowerCase())} · next ${nextDueLabel(nextDueSeconds)}`,
        body: materialTitle,
      });

      // advance session
      setSession((prev) => {
        if (!prev) return prev;
        const next = prev.index + 1;
        return next < prev.items.length ? { ...prev, index: next } : null;
      });
      await load();
    },
    [load, toast]
  );

  const startBlock = useCallback(
    (block: BlockEntry) => {
      const extra = extraByTrack[block.track_slug] ?? [];
      const items = [...block.reviews, ...block.new_items, ...extra];
      if (items.length === 0) return;
      setSession({ blockSlot: block.slot, items, index: 0 });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [extraByTrack]
  );

  const exitSession = useCallback(() => setSession(null), []);

  const pushMore = useCallback(
    async (block: BlockEntry) => {
      setPushingTrack(block.track_slug);
      try {
        const already = new Set<string>();
        for (const it of block.reviews) already.add(it.card_id);
        for (const it of block.new_items) already.add(it.card_id);
        for (const it of extraByTrack[block.track_slug] ?? []) already.add(it.card_id);
        const more = await api.getExtraQueue(block.track_slug, 5, Array.from(already));
        setExtraByTrack((prev) => ({
          ...prev,
          [block.track_slug]: [...(prev[block.track_slug] ?? []), ...more],
        }));
        toast.push({
          kind: more.length ? "success" : "info",
          title: more.length ? `+${more.length} more queued` : "No more items in this track",
          body: block.track_name,
        });
      } catch (e) {
        toast.push({
          kind: "warn",
          title: "Could not pull more",
          body: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setPushingTrack(null);
      }
    },
    [extraByTrack, toast]
  );

  if (loading && !queue) {
    return (
      <div className="today-shell">
        <div className="day-strip">
          <Skeleton width={180} height={14} />
          <Skeleton width={120} height={14} />
        </div>
        <div style={{ marginTop: "2rem" }}>
          <Skeleton width="100%" height={120} radius={10} />
          <SkeletonText lines={2} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-panel">
        <p>{error}</p>
        <p style={{ color: "var(--muted)", marginTop: "0.5rem", fontSize: "0.85rem" }}>
          Ensure the backend is running at :8000.
        </p>
        <button className="primary" onClick={load} style={{ marginTop: "1rem" }}>
          Retry
        </button>
      </div>
    );
  }

  const sessionsThisWeek = stats?.reviews_this_week ?? 0;
  const totalMinutes = activity.reduce((s, a) => s + a.count, 0); // proxy: total reviews ever
  const totalReviewsLifetime = stats?.reviews_total ?? 0;
  const blocks = queue?.blocks ?? [];

  // Active session view
  if (session) {
    const current = session.items[session.index];
    return (
      <div className="today-shell">
        <div className="session-bar">
          <button type="button" className="ghost session-exit" onClick={exitSession}>
            ← Back to blocks
          </button>
          <span className="session-bar-count">
            {session.index + 1} <span className="muted">/ {session.items.length}</span>
          </span>
        </div>
        {current && (
          <ReviewSession
            item={current}
            index={session.index}
            total={session.items.length}
            onComplete={handleReviewComplete}
          />
        )}
        {!current && (
          <section className="caught-up">
            <div className="caught-up-eyebrow">Block complete</div>
            <h1 className="caught-up-title">Nice work.</h1>
            <p className="caught-up-subtitle">
              That block is done. Head back to pick another, or push more from this track.
            </p>
            <div className="caught-up-actions">
              <button type="button" className="btn primary" onClick={exitSession}>
                Back to blocks
              </button>
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="today-shell">
      {/* ── Top day strip: date · activity summary ── */}
      <header className="day-strip">
        <div className="day-strip-left">
          <span className="day-date">{todayDateLabel()}</span>
        </div>
        <div className="day-strip-right">
          <span className="activity-pill" title="Reviews this week">
            <span className="activity-num">{sessionsThisWeek}</span>
            <span className="activity-unit">this week</span>
          </span>
          <span className="activity-pill" title="Lifetime reviews">
            <span className="activity-num">{totalReviewsLifetime}</span>
            <span className="activity-unit">total</span>
          </span>
        </div>
      </header>

      <div className="day-heatmap-wrap">
        <Heatmap data={activity} weeks={16} size={11} gap={3} />
        <div className="day-heatmap-legend">
          <span>{totalMinutes} reviews · 16w</span>
        </div>
      </div>

      {nudge && !nudgeDismissed && nudge.content && (
        <div className="nudge-bar" role="status">
          <span className="nudge-glyph" aria-hidden>◇</span>
          <span className="nudge-text">{nudge.content}</span>
          <button
            type="button"
            className="ghost nudge-dismiss"
            onClick={dismissNudge}
            aria-label="Dismiss for today"
            title="Dismiss for today"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Block stack ── */}
      {blocks.length > 0 ? (
        <section className="block-stack">
          {blocks.map((block) => {
            const extra = extraByTrack[block.track_slug] ?? [];
            const totalItems = block.reviews.length + block.new_items.length + extra.length;
            const totalMin =
              block.planned_minutes +
              extra.reduce((s, it) => s + it.estimated_minutes, 0);
            const isEmpty = totalItems === 0;
            return (
              <article
                key={block.slot}
                className={`block-card${isEmpty ? " empty" : ""}`}
                style={{ ["--block-accent" as string]: block.track_color }}
              >
                <header className="block-card-head">
                  <div>
                    <div className="block-slot">{block.slot_label}</div>
                    <h2 className="block-track">{block.track_name}</h2>
                  </div>
                  <div className="block-card-stats">
                    <span className="block-stat">
                      <strong>{block.reviews.length}</strong> review
                      {block.reviews.length === 1 ? "" : "s"}
                    </span>
                    <span className="block-stat">
                      <strong>{block.new_items.length + extra.length}</strong> new
                    </span>
                    <span className="block-stat block-stat-minutes">~{totalMin}m</span>
                  </div>
                </header>

                {!isEmpty ? (
                  <>
                    <ul className="block-inline-list">
                      {block.reviews.slice(0, 3).map((it) => (
                        <BlockInlineItem key={it.card_id} item={it} kind="review" />
                      ))}
                      {block.new_items.slice(0, 3).map((it) => (
                        <BlockInlineItem key={it.card_id} item={it} kind="new" />
                      ))}
                      {extra.slice(0, 3).map((it) => (
                        <BlockInlineItem key={it.card_id} item={it} kind="new" />
                      ))}
                    </ul>
                    {totalItems > 6 && (
                      <div className="block-more-hint">
                        +{totalItems - 6} more in this block
                      </div>
                    )}
                    <div className="block-card-actions">
                      <button
                        type="button"
                        className="primary block-start"
                        onClick={() => startBlock(block)}
                      >
                        Start block <span aria-hidden>→</span>
                      </button>
                      <button
                        type="button"
                        className="block-push"
                        onClick={() => pushMore(block)}
                        disabled={pushingTrack === block.track_slug}
                        title="Pull 5 more new items from this track"
                      >
                        {pushingTrack === block.track_slug ? "…" : "Push more"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="block-empty">
                    Nothing queued in {block.track_name} right now. Try{" "}
                    <button
                      type="button"
                      className="ghost block-empty-push"
                      onClick={() => pushMore(block)}
                      disabled={pushingTrack === block.track_slug}
                    >
                      pulling more
                    </button>
                    {" "}or jump to{" "}
                    <Link href="/curriculum" className="block-empty-link">
                      roadmap
                    </Link>
                    .
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="caught-up">
          <div className="caught-up-eyebrow">No tracks yet</div>
          <h1 className="caught-up-title">Import your curriculum to begin.</h1>
          <div className="caught-up-actions">
            <Link href="/curriculum" className="btn primary">
              Go to roadmap
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function BlockInlineItem({ item, kind }: { item: QueueItem; kind: "review" | "new" }) {
  const a = resourceAction(item.resource_type);
  return (
    <li className={`block-inline-item kind-${kind}`}>
      <span className="block-inline-icon" aria-hidden>
        {kind === "review" ? "↻" : a.icon}
      </span>
      <span className="block-inline-title">{item.material_title}</span>
      <span className="block-inline-meta">{item.estimated_minutes}m</span>
      {item.material_url && (
        <a
          href={item.material_url}
          target="_blank"
          rel="noreferrer"
          className="block-inline-link"
          title={`${a.label} (external)`}
          onClick={(e) => e.stopPropagation()}
        >
          ↗
        </a>
      )}
    </li>
  );
}
