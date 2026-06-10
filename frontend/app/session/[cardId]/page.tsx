"use client";

/**
 * /session/[cardId] — free-form flashcard review loop.
 *
 * Reads the session queue from sessionStorage (set by the home page when
 * the user starts a block), or falls back to fetching a single-card queue.
 *
 * Legacy block sessions that still carry a slot are redirected to /block/[slot].
 *
 * Keyboard: Space → reveal answer; 1/2/3/4 → Again/Hard/Good/Easy.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, type BlockEntry, type CardDetail, type QueueItem, type Stats } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";
import {
  clearActiveBlockSlot,
  getActiveBlockSlot,
  markBlockComplete,
} from "@/lib/dailyProgress";
import {
  ReviewCard,
  GradeBar,
  ReviewTimer,
  ReviewProgressBar,
  LogTimeMenu,
  SessionComplete,
  ExplainOnMiss,
  useReviewClock,
} from "@/features/review";
import type { GradeKey, GradeTally } from "@/features/review";
import { Skeleton } from "@/components/primitives";
import { EmptyState } from "@/components/primitives";
import { useUnlockCelebration } from "@/features/home/useUnlockCelebration";

// ─── Queue persistence ────────────────────────────────────────────────────────

type Cached = {
  ts: number;
  context: string;
  slot?: number;
  items: QueueItem[];
};

function loadQueue(): Cached | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("compound:session-queue");
    if (!raw) return null;
    return JSON.parse(raw) as Cached;
  } catch {
    return null;
  }
}

function saveQueue(c: Cached) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("compound:session-queue", JSON.stringify(c));
  } catch {}
}

function cardToQueueItem(c: CardDetail, prior?: QueueItem): QueueItem {
  return {
    card_id: c.id,
    material_id: c.material_id,
    material_title: c.material_title,
    material_content: c.material_content,
    material_url: c.material_url,
    block_label: prior?.block_label ?? null,
    resource_type: prior?.resource_type ?? null,
    sequence: prior?.sequence ?? 0,
    track_id: c.track_id,
    track_slug: prior?.track_slug ?? "",
    track_name: c.track_name,
    track_color: c.track_color,
    state: c.state,
    due_at: c.due_at,
    priority_percent: prior?.priority_percent ?? 50,
    estimated_minutes: prior?.estimated_minutes ?? 20,
    cognitive_cost: prior?.cognitive_cost ?? 1,
    difficulty: c.difficulty,
    stability: c.stability,
    retrievability: c.retrievability,
    kind: prior?.kind ?? (c.reps > 0 ? "review" : "new"),
  };
}

async function refreshQueueItems(items: QueueItem[]): Promise<QueueItem[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        const c = await api.getCard(item.card_id);
        return cardToQueueItem(c, item);
      } catch {
        return item;
      }
    })
  );
}

async function fetchFallbackItem(cardId: string): Promise<QueueItem | null> {
  try {
    const c = await api.getCard(cardId);
    return cardToQueueItem(c);
  } catch {
    return null;
  }
}

function startNextBlock(block: BlockEntry, router: { push: (path: string) => void }) {
  const items = [...block.reviews, ...block.new_items];
  if (items.length === 0) return;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("compound:session-block-slot", String(block.slot));
      window.sessionStorage.removeItem("compound:session-clock");
      window.sessionStorage.setItem(
        "compound:session-queue",
        JSON.stringify({
          ts: Date.now(),
          context: `${block.slot_label} · ${block.track_name}`,
          slot: block.slot,
          items,
        })
      );
    } catch {}
  }
  router.push(`/session/${items[0].card_id}`);
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function SessionPage() {
  const router = useRouter();
  const params = useParams<{ cardId: string }>();
  const cardId = params?.cardId ?? "";

  // Redirect block sessions to /block/[slot].
  useEffect(() => {
    const cached = loadQueue();
    const slot = cached?.slot ?? getActiveBlockSlot();
    if (slot != null) {
      router.replace(`/block/${slot}#item-${cardId}`);
    }
  }, [cardId, router]);

  const celebrate = useUnlockCelebration();
  const [queue, setQueue] = useState<Cached | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTs, setStartTs] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [endStats, setEndStats] = useState<Stats | null>(null);
  const [nextBlock, setNextBlock] = useState<BlockEntry | null>(null);
  const [tally, setTally] = useState<GradeTally>({ AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 });
  const [explainMiss, setExplainMiss] = useState(false);
  const { elapsed, paused, togglePause } = useReviewClock(queue?.ts ?? null, !done);

  // Resolve queue from sessionStorage, refresh from API.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cached = loadQueue();
      if (cached?.items.some((it) => it.card_id === cardId)) {
        const items = await refreshQueueItems(cached.items);
        const next: Cached = { ...cached, items };
        if (cancelled) return;
        saveQueue(next);
        setQueue(next);
        setLoading(false);
        return;
      }
      const item = await fetchFallbackItem(cardId);
      if (cancelled) return;
      if (item) {
        const c: Cached = {
          ts: Date.now(),
          context: item.track_name || "Quick session",
          items: [item],
        };
        saveQueue(c);
        setQueue(c);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [cardId]);

  const index = useMemo(() => {
    if (!queue) return -1;
    return queue.items.findIndex((it) => it.card_id === cardId);
  }, [queue, cardId]);

  const current = index >= 0 ? queue?.items[index] : undefined;
  const total = queue?.items.length ?? 0;
  const nextTitle = index >= 0 && queue ? queue.items[index + 1]?.material_title : null;

  // Reset reveal + per-card timer on every new card.
  useEffect(() => {
    setRevealed(false);
    setStartTs(Date.now());
  }, [cardId]);

  const advance = useCallback(() => {
    if (!queue) return;
    const next = queue.items[index + 1];
    if (next) {
      router.push(`/session/${next.card_id}`);
    } else {
      const slot = queue.slot ?? getActiveBlockSlot();
      if (slot != null) markBlockComplete(slot);
      clearActiveBlockSlot();
      api.getStats().then(setEndStats).catch(() => {});
      api.getDailyQueue().then((daily) => {
        const completed = slot ?? -1;
        const open = daily.blocks.find(
          (b) => b.slot !== completed && b.reviews.length + b.new_items.length > 0
        );
        setNextBlock(open ?? null);
      }).catch(() => {});
      setDone(true);
    }
  }, [queue, index, router]);

  const submit = useCallback(async (grade: GradeKey) => {
    if (!current || submitting || explainMiss) return;
    setSubmitting(true);
    const elapsed = Math.round((Date.now() - startTs) / 1000);
    try {
      const result = await api.submitReview(current.card_id, grade, elapsed);
      setTally((prev) => ({ ...prev, [grade]: prev[grade] + 1 }));
      celebrate(result.newly_unlocked);
      if (grade === "AGAIN") {
        setExplainMiss(true);
      } else {
        advance();
      }
    } finally {
      setSubmitting(false);
    }
  }, [current, submitting, explainMiss, startTs, advance, celebrate]);

  // Keyboard: Space = reveal, 1–4 = grade.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " && !revealed && current && !done) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, current, done]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <TopBar
          onExit="/"
          right={null}
        />
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px",
            gap: 20,
          }}
        >
          <Skeleton height={32} width={320} borderRadius={6} />
          <Skeleton height={20} width={480} borderRadius={4} />
          <Skeleton height={20} width={420} borderRadius={4} />
          <Skeleton height={120} width="100%" style={{ maxWidth: 680 }} borderRadius={6} />
        </main>
      </div>
    );
  }

  // ── Completion ─────────────────────────────────────────────────────────────

  if (done || !current) {
    const lastTrack = queue?.items[queue.items.length - 1];
    const accent = lastTrack ? trackAccent(lastTrack.track_slug, lastTrack.track_color) : undefined;

    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <TopBar
          onExit="/"
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ReviewTimer seconds={elapsed} paused={paused} onTogglePause={togglePause} />
              <CounterBadge current={total} total={total} />
            </div>
          }
        />
        <ReviewProgressBar done={total} total={total} />
        <main style={{ flex: 1 }}>
          <SessionComplete
            total={total}
            elapsed={elapsed}
            context={queue?.context}
            accent={accent}
            stats={endStats}
            nextBlock={nextBlock}
            onStartNext={(block) => startNextBlock(block, router)}
            tally={tally}
          />
        </main>
      </div>
    );
  }

  // ── Empty / not found ──────────────────────────────────────────────────────

  if (!queue) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <TopBar onExit="/" right={null} />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState
            title="Card not found"
            description="This card couldn't be loaded. It may have been removed or completed."
            action={<Link href="/" style={{ color: "var(--accent)", fontSize: 14 }}>← Back to Today</Link>}
          />
        </main>
      </div>
    );
  }

  // ── Active card ────────────────────────────────────────────────────────────

  const accent = trackAccent(current.track_slug, current.track_color);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* Top bar */}
      <TopBar
        onExit="/"
        trackName={queue?.context ?? current.track_name}
        trackAccent={accent}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogTimeMenu materialId={current.material_id} materialTitle={current.material_title} />
            <ReviewTimer
              seconds={elapsed}
              paused={paused}
              onTogglePause={togglePause}
              label="Time in this block (pause excluded)"
            />
            <CounterBadge current={index + 1} total={total} />
          </div>
        }
      />
      <ReviewProgressBar done={index + 1} total={total} />

      {/* Card surface */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 24px 160px",
          overflowY: "auto",
        }}
      >
        <ReviewCard item={current} revealed={revealed} nextTitle={nextTitle} />
        {explainMiss && (
          <ExplainOnMiss
            materialTitle={current.material_title}
            onContinue={() => {
              setExplainMiss(false);
              advance();
            }}
          />
        )}
      </main>

      {/* Sticky footer */}
      <footer
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--canvas)",
          borderTop: "1px solid var(--hairline)",
          padding: "16px 24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          zIndex: 100,
        }}
      >
        {!revealed ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Done with the material?</p>
              <button
                type="button"
                onClick={() => setRevealed(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 20px",
                  borderRadius: 4,
                  border: "1px solid transparent",
                  background: "var(--accent)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background 100ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
                }}
              >
                Show recall
                <kbd
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 5px",
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.35)",
                    fontSize: 11,
                    lineHeight: 1,
                    fontFamily: "inherit",
                    opacity: 0.8,
                  }}
                >
                  Space
                </kbd>
              </button>
            </div>
            {/* Keyboard hint bar — before reveal */}
            <KeyboardHintBar phase="pre-reveal" />
          </>
        ) : explainMiss ? null : (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
              <p style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
                How well did you recall?
              </p>
              <GradeBar
                enabled={!submitting}
                submitting={submitting}
                onRate={submit}
                bindKeys
              />
            </div>
            {/* Keyboard hint bar — after reveal */}
            <KeyboardHintBar phase="post-reveal" />
          </>
        )}
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TopBar({
  onExit,
  trackName,
  trackAccent: accent,
  right,
}: {
  onExit: string;
  trackName?: string;
  trackAccent?: string;
  right: React.ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 44,
        padding: "0 16px",
        borderBottom: "1px solid var(--hairline)",
        background: "var(--canvas)",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}
    >
      {/* Left: exit + context */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          href={onExit}
          style={{
            fontSize: 13,
            color: "var(--muted)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 6px",
            borderRadius: 4,
            transition: "color 100ms, background 100ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--overlay-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
          }}
        >
          ← Exit
        </Link>

        {trackName && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 13,
              color: "var(--text)",
              fontWeight: 500,
              maxWidth: 260,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {accent && (
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: accent,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
            )}
            {trackName}
          </span>
        )}
      </div>

      {/* Right: meta controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {right}
      </div>
    </header>
  );
}

function CounterBadge({ current, total }: { current: number; total: number }) {
  return (
    <span
      style={{
        fontSize: 13,
        color: "var(--muted)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {current}
      <span style={{ opacity: 0.5 }}> / {total}</span>
    </span>
  );
}

/**
 * KeyboardHintBar — subtle, persistent footer hint strip.
 * Pre-reveal: highlights Space. Post-reveal: highlights 1-4.
 */
function KeyboardHintBar({ phase }: { phase: "pre-reveal" | "post-reveal" }) {
  const hints: { key: string; label: string; active: boolean }[] = [
    { key: "Space", label: "reveal", active: phase === "pre-reveal" },
    { key: "1", label: "Again", active: phase === "post-reveal" },
    { key: "2", label: "Hard",  active: phase === "post-reveal" },
    { key: "3", label: "Good",  active: phase === "post-reveal" },
    { key: "4", label: "Easy",  active: phase === "post-reveal" },
  ];

  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 11,
        color: "var(--muted)",
        opacity: 0.65,
        userSelect: "none",
      }}
    >
      {hints.map(({ key, label, active }) => {
        const dimmed = !active;
        return (
          <span
            key={key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              opacity: dimmed ? 0.4 : 1,
              transition: "opacity 150ms",
            }}
          >
            <kbd
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: key === "Space" ? "2px 6px" : "2px 5px",
                borderRadius: 3,
                border: "1px solid var(--hairline)",
                background: "var(--panel)",
                fontSize: 10,
                fontFamily: "inherit",
                lineHeight: 1,
                color: active ? "var(--text)" : "var(--muted)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {key}
            </kbd>
            <span style={{ color: "var(--muted)" }}>{label}</span>
          </span>
        );
      })}
    </div>
  );
}
