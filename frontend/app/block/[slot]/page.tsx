"use client";

/**
 * /block/[slot] — focus-window block session.
 *
 * A block is a curated queue of cards (reviews + new items) for a given
 * time slot (morning / afternoon / evening).  Cards are presented as a
 * vertical list; the current card is expanded and interactive; completed
 * cards show a strikethrough with a green checkmark.
 *
 * Flow per card:
 *   expand → (resource link + brief) → "Done working" → reveal recall →
 *   GradeBar → submit → next card becomes active
 *
 * Keyboard:
 *   Space      → mark current card "done working" (if not yet done)
 *   1 / 2 / 3 / 4 → grade (Again / Hard / Good / Easy) after done working
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, type BlockSession } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";
import { markBlockComplete } from "@/lib/dailyProgress";
import {
  BlockItemCard,
  GradeBar,
  ReviewProgressBar,
  GRADE_RATINGS,
} from "@/features/review";
import type { GradeKey } from "@/features/review";
import { Skeleton } from "@/components/primitives";
import { EmptyState } from "@/components/primitives";

export default function BlockPage() {
  const router = useRouter();
  const params = useParams<{ slot: string }>();
  const slot = Number(params?.slot ?? "1");

  const [session, setSession] = useState<BlockSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [doneWorkingIds, setDoneWorkingIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [itemStartTs, setItemStartTs] = useState(Date.now());

  // Load or start the block session.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: BlockSession;
      try {
        data = await api.getBlockSession(slot);
      } catch {
        data = await api.startBlockSession(slot);
      }
      setSession(data);
      const active = data.active_card_id ?? data.items[data.current_index]?.card_id ?? null;
      setExpandedId(active);
      setDoneWorkingIds(new Set());
      setItemStartTs(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load block");
    } finally {
      setLoading(false);
    }
  }, [slot]);

  useEffect(() => { load(); }, [load]);

  const accent = session ? trackAccent(session.track_slug, session.track_color) : undefined;
  const progressPct = session
    ? Math.round((session.current_index / Math.max(session.total_items, 1)) * 100)
    : 0;
  const remaining = session
    ? session.items.slice(session.current_index).reduce((s, i) => s + i.estimated_minutes, 0)
    : 0;

  const activeId = session?.active_card_id ?? null;

  // When active card changes, expand it and reset per-item timer.
  useEffect(() => {
    if (activeId) {
      setExpandedId(activeId);
      setDoneWorkingIds(new Set());
      setItemStartTs(Date.now());
      const el = document.getElementById(`item-${activeId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeId]);

  const submitRating = useCallback(
    async (cardId: string, rating: GradeKey) => {
      if (!session || submitting) return;
      setSubmitting(true);
      const elapsed = Math.round((Date.now() - itemStartTs) / 1000);
      try {
        const next = await api.submitBlockReview(slot, cardId, rating, elapsed);
        setSession(next);
        setDoneWorkingIds(new Set());
        if (next.status === "COMPLETED") {
          markBlockComplete(slot);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [session, submitting, slot, itemStartTs]
  );

  // Keyboard shortcuts: Space = done working; 1–4 = grade when done.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!activeId || !session) return;
      const done = doneWorkingIds.has(activeId);
      if (!done && e.key === " ") {
        e.preventDefault();
        setDoneWorkingIds((prev) => new Set(prev).add(activeId));
        return;
      }
      const r = GRADE_RATINGS.find((rt) => rt.shortcut === e.key);
      if (r && done) void submitRating(activeId, r.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, session, doneWorkingIds, submitRating]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <BlockTopBar slot={slot} session={null} accent={undefined} remaining={0} />
        <ReviewProgressBar done={0} total={0} />
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "32px 24px",
            maxWidth: 720,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={56} borderRadius={6} />
          ))}
        </main>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !session) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <BlockTopBar slot={slot} session={null} accent={undefined} remaining={0} />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState
            title={error ?? "Block not found"}
            description="This study block couldn't be loaded. Try returning to Today."
            action={
              <Link href="/" style={{ color: "var(--accent)", fontSize: 14 }}>
                ← Back to Today
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  // ── Completed ──────────────────────────────────────────────────────────────

  if (session.status === "COMPLETED") {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <BlockTopBar slot={slot} session={session} accent={accent} remaining={0} />
        <ReviewProgressBar done={session.total_items} total={session.total_items} />
        <main style={{ flex: 1 }}>
          <BlockComplete session={session} accent={accent} onHome={() => router.push("/")} />
        </main>
      </div>
    );
  }

  // ── Active block ───────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <BlockTopBar slot={slot} session={session} accent={accent} remaining={remaining} />
      <ReviewProgressBar done={session.current_index} total={session.total_items} />

      <main
        style={{
          flex: 1,
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
          padding: "32px 24px 48px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Intro strip */}
        <div style={{ marginBottom: 8 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.3,
            }}
          >
            {session.track_name}
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>
            {session.total_items} items · work top to bottom · leave for external resources, return here to rate
          </p>
        </div>

        {/* Card list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {session.items.map((item, index) => (
            <BlockItemCard
              key={item.card_id}
              item={item}
              index={index}
              currentIndex={session.current_index}
              expanded={expandedId === item.card_id}
              doneWorking={doneWorkingIds.has(item.card_id)}
              submitting={submitting}
              onToggle={() =>
                setExpandedId((id) => (id === item.card_id ? null : item.card_id))
              }
              onDoneWorking={() =>
                setDoneWorkingIds((prev) => new Set(prev).add(item.card_id))
              }
              onRate={(rating) => void submitRating(item.card_id, rating)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BlockTopBar({
  slot,
  session,
  accent,
  remaining,
}: {
  slot: number;
  session: BlockSession | null;
  accent: string | undefined;
  remaining: number;
}) {
  const done = session?.current_index ?? 0;
  const total = session?.total_items ?? 0;

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
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          href="/"
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
          ← Today
        </Link>

        {session && (
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
            {session.slot_label} · {session.track_name}
          </span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)" }}>
        {remaining > 0 && (
          <span style={{ fontSize: 12 }}>~{remaining}m left</span>
        )}
        {total > 0 && (
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {done}
            <span style={{ opacity: 0.5 }}> / {total || "—"}</span>
          </span>
        )}
      </div>
    </header>
  );
}

function BlockComplete({
  session,
  accent,
  onHome,
}: {
  session: BlockSession;
  accent: string | undefined;
  onHome: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 20,
        padding: "64px 24px",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* Badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 12px",
          borderRadius: 3,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          background: "color-mix(in srgb, var(--ok) 10%, transparent)",
          color: "var(--ok)",
          border: "1px solid color-mix(in srgb, var(--ok) 20%, transparent)",
        }}
      >
        Block complete
      </span>

      {/* Headline */}
      <h1
        style={{
          fontSize: "clamp(24px, 5vw, 36px)",
          fontWeight: 700,
          lineHeight: 1.2,
          color: accent ?? "var(--text)",
          letterSpacing: "-0.02em",
        }}
      >
        {session.total_items} item{session.total_items === 1 ? "" : "s"} · {session.track_name}
      </h1>

      <p style={{ fontSize: 14, color: "var(--muted)" }}>
        {session.slot_label} · ~{session.planned_minutes}m planned
      </p>

      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
        Nice work. Knowledge compounds.
      </p>

      <button
        type="button"
        onClick={onHome}
        style={{
          padding: "10px 24px",
          borderRadius: 4,
          border: "1px solid transparent",
          background: "var(--accent)",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 100ms",
          marginTop: 8,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
        }}
      >
        Back to Today →
      </button>
    </div>
  );
}
