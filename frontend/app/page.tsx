"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { Heatmap } from "@/components/Heatmap";
import { trackAccent } from "@/lib/trackColors";
import { api, type BlockEntry, type CoachInsight, type QueueItem, type User } from "@/lib/api";
import {
  countCompleted,
  getCompletedSlots,
  isBlockComplete,
} from "@/lib/dailyProgress";
import { getLocalDateKey } from "@/lib/time";

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
  const [user, setUser] = useState<User | null>(null);
  const [completedSlots, setCompletedSlots] = useState<number[]>([]);

  useEffect(() => {
    api.getUser().then(setUser).catch(() => {});
    setCompletedSlots(getCompletedSlots());
  }, [queue, stats]);

  const trackBySlug = useMemo(
    () => Object.fromEntries(tracks.map((t) => [t.slug, t])),
    [tracks]
  );

  // ── Nudge ────────────────────────────────────────────────
  useEffect(() => {
    const today = getLocalDateKey();
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
    const today = getLocalDateKey();
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
    (block: BlockEntry) => {
      router.push(`/block/${block.slot}`);
    },
    [router]
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
  const activeBlocks = blocks.filter(
    (b) => b.reviews.length + b.new_items.length + (extraByTrack[b.track_slug]?.length ?? 0) > 0
  );
  const blocksDone = countCompleted(blocks.map((b) => b.slot));
  const firstOpenBlock = activeBlocks.find((b) => !isBlockComplete(b.slot)) ?? activeBlocks[0];
  const allBlocksDone = activeBlocks.length > 0 && blocksDone >= activeBlocks.length;
  const minutesGoal = queue?.total_minutes ?? stats?.daily_goal_minutes ?? 120;
  const minutesToday = stats?.minutes_today ?? 0;
  const minutesPct = minutesGoal > 0 ? Math.min(100, Math.round((minutesToday / minutesGoal) * 100)) : 0;
  const autoStarted = useRef(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Once per day: open Today → land in practice immediately (zero decisions).
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

  return (
    <>
      <PracticeHero
        date={date}
        stats={stats}
        nudge={!nudgeDismissed ? nudge : null}
        blocksDone={blocksDone}
        blocksTotal={activeBlocks.length}
        allBlocksDone={allBlocksDone}
        minutesToday={minutesToday}
        minutesGoal={minutesGoal}
        minutesPct={minutesPct}
        learningFocus={user?.milestone_title}
        onStart={() => firstOpenBlock && startBlock(firstOpenBlock)}
        canStart={Boolean(firstOpenBlock)}
      />

      {firstOpenBlock && !allBlocksDone && (
        <BlockChecklistPreview block={firstOpenBlock} onOpen={() => startBlock(firstOpenBlock)} />
      )}

      {blocks.length === 0 ? (
        <div className="empty-today">
          <h2 className="empty-today-title">Your canvas is empty.</h2>
          <p className="empty-today-sub">
            Create tracks from scratch, generate a personalized roadmap, or import
            the four example tracks when you want a starting point.
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
          <button
            type="button"
            className="today-schedule-toggle"
            onClick={() => setShowSchedule((v) => !v)}
            aria-expanded={showSchedule}
          >
            {showSchedule ? "Hide schedule" : `Today's schedule · ${activeBlocks.length} block${activeBlocks.length === 1 ? "" : "s"}`}
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
    </>
  );
}

function PracticeHero({
  date,
  stats,
  nudge,
  blocksDone,
  blocksTotal,
  allBlocksDone,
  minutesToday,
  minutesGoal,
  minutesPct,
  learningFocus,
  onStart,
  canStart,
}: {
  date: { day: string; meta: string };
  stats: import("@/lib/api").Stats | null;
  nudge: CoachInsight | null;
  blocksDone: number;
  blocksTotal: number;
  allBlocksDone: boolean;
  minutesToday: number;
  minutesGoal: number;
  minutesPct: number;
  learningFocus?: string | null;
  onStart: () => void;
  canStart: boolean;
}) {
  const streak = stats?.current_streak ?? 0;
  const reviewsToday = stats?.reviews_today ?? 0;
  const mastered = stats?.materials_mastered ?? 0;
  const totalMaterials = stats?.total_materials ?? 0;

  const ctaLabel = allBlocksDone
    ? "Review completed blocks"
    : blocksDone > 0
      ? "Continue block"
      : "Open block";

  return (
    <section className="practice-hero">
      <div className="practice-hero-top">
        <div>
          <p className="practice-hero-eyebrow">Lifelong learning · {date.meta}</p>
          <h1 className="practice-hero-title">{date.day}</h1>
          {learningFocus && (
            <p className="practice-hero-focus">Exploring · {learningFocus}</p>
          )}
          {nudge?.content && <p className="practice-hero-nudge">{nudge.content}</p>}
        </div>
        <div className="practice-hero-streak" title={`Best rhythm: ${stats?.longest_streak ?? 0} days`}>
          <span className="practice-hero-streak-num">{streak}</span>
          <span className="practice-hero-streak-label">day rhythm</span>
        </div>
      </div>

      <div className="practice-hero-progress">
        <div className="practice-hero-ring" style={{ ["--pct" as string]: String(minutesPct) }}>
          <svg viewBox="0 0 36 36" aria-hidden>
            <path
              className="practice-hero-ring-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="practice-hero-ring-fill"
              strokeDasharray={`${minutesPct}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="practice-hero-ring-label">{minutesPct}%</span>
        </div>

        <div className="practice-hero-stats">
          <div className="practice-hero-stat">
            <strong>{minutesToday}</strong>
            <span>min today</span>
            <span className="muted">{minutesGoal}m planned</span>
          </div>
          <div className="practice-hero-stat">
            <strong>{reviewsToday}</strong>
            <span>reviews today</span>
          </div>
          <div className="practice-hero-stat">
            <strong>{blocksDone}/{blocksTotal || "—"}</strong>
            <span>blocks today</span>
          </div>
          {totalMaterials > 0 && (
            <div className="practice-hero-stat">
              <strong>{mastered}</strong>
              <span>mastered</span>
              <span className="muted">of {totalMaterials} total</span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="v2-btn primary practice-hero-cta"
        onClick={onStart}
        disabled={!canStart}
      >
        {ctaLabel} <span aria-hidden>→</span>
      </button>

      <p className="practice-hero-foot">
        Finish a track?{" "}
        <Link href="/curriculum/edit">Add more to your library</Link>
        {" "}— Compound grows with you.
      </p>
    </section>
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
