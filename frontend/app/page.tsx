"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { Heatmap } from "@/components/Heatmap";
import { trackAccent } from "@/lib/trackColors";
import { api, type BlockEntry, type CoachInsight, type QueueItem } from "@/lib/api";

const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function dateLabel(): { day: string; meta: string } {
  const d = new Date();
  return {
    day: d.toLocaleDateString("en-US", { weekday: "long" }),
    meta: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
}

export default function TodayPage() {
  const shell = useShell();
  const router = useRouter();
  const { queue, stats, tracks, activity, reloadQueue, setRightPanel, setActions } = shell;

  const [nudge, setNudge] = useState<CoachInsight | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [extraByTrack, setExtraByTrack] = useState<Record<string, QueueItem[]>>({});
  const [pushingTrack, setPushingTrack] = useState<string | null>(null);

  const trackBySlug = useMemo(
    () => Object.fromEntries(tracks.map((t) => [t.slug, t])),
    [tracks]
  );

  // ── Nudge ────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof window !== "undefined") {
      if (window.localStorage.getItem("compound:nudge-dismiss") === today) {
        setNudgeDismissed(true);
        return;
      }
    }
    let cancelled = false;
    api
      .getDailyInsight()
      .then((n) => !cancelled && setNudge(n))
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

  const refreshNudge = useCallback(() => {
    setNudgeDismissed(false);
    api.getDailyInsight(true).then(setNudge).catch(() => {});
  }, []);

  // ── Block actions ────────────────────────────────────────
  const startBlock = useCallback(
    async (block: BlockEntry) => {
      let active = block;
      try {
        const daily = await api.getDailyQueue();
        const fresh = daily.blocks.find((b) => b.slot === block.slot);
        if (fresh) active = fresh;
      } catch {
        /* use cached block if refresh fails */
      }
      const extra = extraByTrack[active.track_slug] ?? [];
      const items = [...active.reviews, ...active.new_items, ...extra];
      if (items.length === 0) return;
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem("compound:session-clock");
          window.sessionStorage.setItem(
            "compound:session-queue",
            JSON.stringify({
              ts: Date.now(),
              context: `${active.slot_label} · ${active.track_name}`,
              items,
            })
          );
        } catch {}
      }
      router.push(`/session/${items[0].card_id}`);
    },
    [extraByTrack, router]
  );

  const pushMore = useCallback(
    async (slug: string) => {
      const block = queue?.blocks.find((b) => b.track_slug === slug);
      setPushingTrack(slug);
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
      } finally {
        setPushingTrack(null);
      }
    },
    [queue, extraByTrack]
  );

  // ── Expose actions to command palette ────────────────────
  useEffect(() => {
    setActions({
      onRefreshNudge: refreshNudge,
      onPushMore: pushMore,
      onStartFirstBlock: () => {
        const block = queue?.blocks.find(
          (b) => b.reviews.length + b.new_items.length > 0
        );
        if (block) startBlock(block);
      },
    });
    return () => setActions({});
  }, [setActions, refreshNudge, pushMore, queue, startBlock]);

  // ── Right panel content ──────────────────────────────────
  useEffect(() => {
    setRightPanel(
      <RightPanel>
        {!nudgeDismissed && nudge && nudge.content ? (
          <PanelSection
            label="Today's nudge"
            action={
              <button
                type="button"
                className="appbar-icon-btn"
                onClick={refreshNudge}
                aria-label="Refresh nudge"
                title="Refresh"
              >
                ↺
              </button>
            }
          >
            <div className="panel-nudge">
              {nudge.content}
              <button
                type="button"
                className="panel-nudge-dismiss"
                onClick={dismissNudge}
              >
                Dismiss for today ✕
              </button>
            </div>
          </PanelSection>
        ) : null}

        {activity.length > 0 && (
          <PanelSection label="Activity · last 16 weeks">
            <div className="panel-heatmap-wrap">
              <Heatmap data={activity} weeks={16} size={10} gap={3} />
            </div>
          </PanelSection>
        )}

        <PanelSection label="This week">
          <ThisWeek tracks={trackBySlug} />
        </PanelSection>

        {stats && (
          <PanelSection label="Progress">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="stat">
                <span className="stat-num">{stats.materials_started}</span>
                <span className="stat-label">started</span>
                <span className="stat-hint">
                  of {stats.total_materials} · {stats.materials_mastered} mastered
                </span>
              </div>
              <div className="stat">
                <span className="stat-num">
                  {Math.round((stats.retention_rate || 0) * 100)}%
                </span>
                <span className="stat-label">retention</span>
                <span className="stat-hint">
                  {stats.days_active_30d} active days / 30
                </span>
              </div>
              <div className="stat">
                <span className="stat-num">{stats.total_minutes_invested}</span>
                <span className="stat-label">minutes invested</span>
              </div>
            </div>
          </PanelSection>
        )}
      </RightPanel>
    );
    return () => setRightPanel(null);
  }, [setRightPanel, nudge, nudgeDismissed, refreshNudge, dismissNudge, stats, trackBySlug, activity]);

  const date = dateLabel();
  const blocks = queue?.blocks ?? [];

  return (
    <>
      <header className="today-head">
        <div className="today-date">
          <span className="today-date-day">{date.day}</span>
          <span className="today-date-meta">{date.meta}</span>
        </div>
        <div className="today-metrics">
          <div className="stat today-metric">
            <span className="stat-num">{stats?.sessions_this_week ?? 0}</span>
            <span className="stat-label">sessions / wk</span>
          </div>
          <div className="stat today-metric">
            <span className="stat-num">{stats?.reviews_total ?? 0}</span>
            <span className="stat-label">reviews</span>
          </div>
        </div>
      </header>

      {blocks.length === 0 ? (
        <div className="empty-today">
          <h2 className="empty-today-title">No blocks today.</h2>
          <p className="empty-today-sub">
            Either every assigned track is paused, or you haven&apos;t imported a
            curriculum yet.{" "}
            <Link href="/curriculum">Open the roadmap</Link>.
          </p>
        </div>
      ) : (
        <div className="today-blocks">
          {blocks.map((block) => (
            <BlockRow
              key={block.slot}
              block={block}
              extra={extraByTrack[block.track_slug] ?? []}
              onStart={() => startBlock(block)}
              onPush={() => pushMore(block.track_slug)}
              pushing={pushingTrack === block.track_slug}
            />
          ))}
        </div>
      )}
    </>
  );
}

function BlockRow({
  block,
  extra,
  onStart,
  onPush,
  pushing,
}: {
  block: BlockEntry;
  extra: QueueItem[];
  onStart: () => void;
  onPush: () => void;
  pushing: boolean;
}) {
  const accent = trackAccent(block.track_slug, block.track_color);
  const allItems = [...block.reviews, ...block.new_items, ...extra];
  const next = allItems[0];
  const remaining = Math.max(allItems.length - 1, 0);
  const isEmpty = allItems.length === 0;

  return (
    <article
      className={`block-row${isEmpty ? " empty" : ""}`}
      style={{ ["--track-color" as string]: accent }}
    >
      <div className="block-row-main">
        <div className="block-row-eyebrow">
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
          Start <span aria-hidden>›</span>
        </button>
        <button
          type="button"
          className="v2-btn ghost sm"
          onClick={onPush}
          disabled={pushing}
          title="Pull 5 more new items"
        >
          {pushing ? "…" : "+5"}
        </button>
      </div>
    </article>
  );
}

function ThisWeek({ tracks }: { tracks: Record<string, { name: string; slug: string; color: string }> }) {
  const [schedule, setSchedule] = useState<Record<string, { block: number; track: string }[]> | null>(null);
  useEffect(() => {
    api.getWeeklySchedule().then(setSchedule).catch(() => {});
  }, []);
  const today = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  return (
    <div className="week-list">
      {DAY_ABBR.map((abbr, i) => {
        const slugs = (schedule?.[DAY_KEYS[i]] ?? []).map((b) => b.track);
        const isToday = i === today;
        return (
          <div key={abbr} className={`week-row${isToday ? " today" : ""}`}>
            <span className="week-day">{abbr}</span>
            <span className="week-tracks">
              {slugs.map((slug) => {
                const t = tracks[slug];
                if (!t) return null;
                return (
                  <span key={slug} title={t.name}>
                    <span
                      className="week-dot"
                      style={{ background: trackAccent(slug, t.color) }}
                      aria-hidden
                    />
                    {t.name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
                  </span>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
