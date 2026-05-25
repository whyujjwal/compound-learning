"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  SessionCard,
  SessionDock,
  useSessionKeys,
  type Rating,
} from "@/components/ui/SessionCard";
import { trackAccent } from "@/lib/trackColors";
import { api, type QueueItem } from "@/lib/api";

type Cached = {
  ts: number;
  context: string;
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

/** Fallback: build a 1-item queue from a CardDetail when sessionStorage is empty. */
async function fetchFallbackItem(cardId: string): Promise<QueueItem | null> {
  try {
    const c = await api.getCard(cardId);
    return {
      card_id: c.id,
      material_id: c.material_id,
      material_title: c.material_title,
      material_content: c.material_content,
      material_url: c.material_url,
      block_label: null,
      resource_type: null,
      sequence: 0,
      track_id: c.track_id,
      track_slug: "",
      track_name: c.track_name,
      track_color: c.track_color,
      state: c.state,
      due_at: c.due_at,
      priority_percent: 50,
      estimated_minutes: 20,
      cognitive_cost: 1,
      difficulty: c.difficulty,
      stability: c.stability,
      retrievability: c.retrievability,
      kind: c.reps > 0 ? "review" : "new",
    };
  } catch {
    return null;
  }
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams<{ cardId: string }>();
  const cardId = params?.cardId ?? "";

  const [queue, setQueue] = useState<Cached | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTs, setStartTs] = useState(Date.now());
  const [done, setDone] = useState(false);

  // Resolve queue: prefer sessionStorage; otherwise fetch a single card.
  useEffect(() => {
    const cached = loadQueue();
    if (cached && cached.items.some((it) => it.card_id === cardId)) {
      setQueue(cached);
      setLoading(false);
      return;
    }
    fetchFallbackItem(cardId).then((item) => {
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
    });
  }, [cardId]);

  const index = useMemo(() => {
    if (!queue) return -1;
    return queue.items.findIndex((it) => it.card_id === cardId);
  }, [queue, cardId]);

  const current = index >= 0 ? queue?.items[index] : undefined;
  const total = queue?.items.length ?? 0;

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
      setDone(true);
    }
  }, [queue, index, router]);

  const submit = useCallback(
    async (rating: Rating) => {
      if (!current || submitting) return;
      setSubmitting(true);
      const elapsed = Math.round((Date.now() - startTs) / 1000);
      try {
        await api.submitReview(current.card_id, rating, elapsed);
        advance();
      } finally {
        setSubmitting(false);
      }
    },
    [current, submitting, startTs, advance]
  );

  useSessionKeys(revealed, Boolean(current && !submitting), () => setRevealed(true), submit);

  if (loading) {
    return (
      <>
        <header className="session-bar">
          <SessionExit />
        </header>
        <div className="session-card-wrap">
          <p className="session-prompt">Loading…</p>
        </div>
      </>
    );
  }

  if (done || !current) {
    const lastTrack = queue?.items[queue.items.length - 1];
    const accent = lastTrack ? trackAccent(lastTrack.track_slug, lastTrack.track_color) : undefined;
    return (
      <>
        <header className="session-bar">
          <SessionExit />
          <span className="session-bar-counter">
            {total} <span className="total">/ {total}</span>
          </span>
        </header>
        <div className="session-end">
          <h1 className="session-end-title" style={accent ? { color: accent } : undefined}>
            Block complete.
          </h1>
          <p className="session-end-sub">
            Heatmap will catch up shortly. Pick another block or call it.
          </p>
          <div style={{ display: "inline-flex", gap: 8 }}>
            <Link href="/" className="v2-btn primary">Back to Today</Link>
            <Link href="/curriculum" className="v2-btn ghost">Roadmap</Link>
          </div>
        </div>
        <div />
      </>
    );
  }

  const accent = trackAccent(current.track_slug, current.track_color);

  return (
    <>
      <header className="session-bar">
        <div className="session-bar-left">
          <SessionExit />
          <span className="session-bar-track" style={{ ["--track-color" as string]: accent }}>
            <span className="track-dot" aria-hidden />
            {queue?.context ?? current.track_name}
          </span>
        </div>
        <span className="session-bar-counter">
          {index + 1} <span className="total">/ {total}</span>
        </span>
      </header>
      <div className="session-card-wrap">
        <SessionCard
          item={current}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
        />
      </div>
      <SessionDock
        enabled={revealed}
        submitting={submitting}
        onRate={submit}
      />
    </>
  );
}

function SessionExit() {
  return (
    <Link href="/" className="session-bar-exit">
      ← Exit
    </Link>
  );
}
