"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BlockItemRow,
  type BlockRating,
  BLOCK_RATINGS,
} from "@/components/ui/BlockItemRow";
import { trackAccent } from "@/lib/trackColors";
import { api, type BlockSession } from "@/lib/api";
import { markBlockComplete } from "@/lib/dailyProgress";

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

  useEffect(() => {
    load();
  }, [load]);

  const accent = session ? trackAccent(session.track_slug, session.track_color) : undefined;
  const progressPct = session
    ? Math.round((session.current_index / Math.max(session.total_items, 1)) * 100)
    : 0;
  const remaining = session
    ? session.items.slice(session.current_index).reduce((s, i) => s + i.estimated_minutes, 0)
    : 0;

  const activeId = session?.active_card_id ?? null;

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
    async (cardId: string, rating: BlockRating) => {
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
      const r = BLOCK_RATINGS.find((rt) => rt.shortcut === e.key);
      if (r && done) submitRating(activeId, r.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, session, doneWorkingIds, submitRating]);

  if (loading) {
    return (
      <>
        <BlockHeader accent={accent} session={null} slot={slot} />
        <div className="block-page-wrap">
          <p className="session-prompt">Loading block…</p>
        </div>
      </>
    );
  }

  if (error || !session) {
    return (
      <>
        <BlockHeader accent={accent} session={null} slot={slot} />
        <div className="block-page-wrap">
          <p className="session-prompt">{error ?? "Block not found"}</p>
          <Link href="/" className="v2-btn ghost">
            ← Back to Today
          </Link>
        </div>
      </>
    );
  }

  if (session.status === "COMPLETED") {
    return (
      <>
        <BlockHeader accent={accent} session={session} slot={slot} />
        <div className="block-page-wrap">
          <div className="session-end">
            <p className="session-end-badge">Block complete</p>
            <h1 className="session-end-title" style={accent ? { color: accent } : undefined}>
              {session.total_items} item{session.total_items === 1 ? "" : "s"} · {session.track_name}
            </h1>
            <p className="session-end-context">
              {session.slot_label} · ~{session.planned_minutes}m planned
            </p>
            <p className="session-end-sub">Nice work. Knowledge compounds.</p>
            <div className="session-end-actions">
              <button type="button" className="v2-btn primary" onClick={() => router.push("/")}>
                Back to Today →
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="session-header-wrap">
        <BlockHeader accent={accent} session={session} slot={slot} progressPct={progressPct} remaining={remaining} />
      </div>
      <div className="block-page-wrap">
        <div className="block-page-intro">
          <h1 className="block-page-title">{session.track_name}</h1>
          <p className="block-page-sub">
            {session.total_items} items · work top to bottom · leave for external resources, return here to rate
          </p>
        </div>
        <div className="block-item-list">
          {session.items.map((item, index) => (
            <BlockItemRow
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
              onDoneWorking={() => setDoneWorkingIds((prev) => new Set(prev).add(item.card_id))}
              onRate={(rating) => submitRating(item.card_id, rating)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function BlockHeader({
  accent,
  session,
  slot,
  progressPct = 0,
  remaining = 0,
}: {
  accent?: string;
  session: BlockSession | null;
  slot: number;
  progressPct?: number;
  remaining?: number;
}) {
  const done = session?.current_index ?? 0;
  const total = session?.total_items ?? 0;

  return (
    <>
      <header className="session-bar">
        <div className="session-bar-left">
          <Link href="/" className="session-bar-exit">
            ← Today
          </Link>
          {session && (
            <span className="session-bar-track" style={{ ["--track-color" as string]: accent }}>
              <span className="track-dot" aria-hidden />
              {session.slot_label} · {session.track_name}
            </span>
          )}
        </div>
        <div className="session-bar-meta">
          {session && remaining > 0 && (
            <span className="block-header-remaining">~{remaining}m left</span>
          )}
          <span className="session-bar-counter">
            {done} <span className="total">/ {total || "—"}</span>
          </span>
        </div>
      </header>
      {session && total > 0 && (
        <div
          className="session-bar-progress"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div className="session-bar-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}
    </>
  );
}
