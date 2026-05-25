"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resourceAction } from "@/lib/resourceAction";
import { api, type QueueItem } from "@/lib/api";

const RATINGS = [
  { key: "AGAIN", label: "Again", shortcut: "1", className: "again" },
  { key: "HARD", label: "Hard", shortcut: "2", className: "hard" },
  { key: "GOOD", label: "Good", shortcut: "3", className: "good" },
  { key: "EASY", label: "Easy", shortcut: "4", className: "easy" },
] as const;

type OnComplete = (rating: string, nextDueSeconds: number, materialTitle: string) => void | Promise<void>;

export function ReviewSession({
  item,
  onComplete,
  index,
  total,
}: {
  item: QueueItem;
  onComplete: OnComplete;
  index: number;
  total: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());

  const handleReview = useCallback(
    async (rating: string) => {
      if (submitting) return;
      setSubmitting(true);
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      try {
        const res = await api.submitReview(item.card_id, rating, elapsed);
        const nextDueSeconds = Math.max(
          0,
          Math.floor((new Date(res.card.due_at).getTime() - Date.now()) / 1000)
        );
        await onComplete(rating, nextDueSeconds, item.material_title);
      } finally {
        setSubmitting(false);
      }
    },
    [item.card_id, item.material_title, onComplete, submitting]
  );

  useEffect(() => {
    startRef.current = Date.now();
    setRevealed(false);
  }, [item.card_id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " && !revealed) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      const rating = RATINGS.find((r) => r.shortcut === e.key);
      if (rating && revealed) handleReview(rating.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, handleReview]);

  return (
    <div className="review-session">
      <div className="review-progress">
        <span>
          Card {index + 1} of {total}
        </span>
        <span>
          {item.estimated_minutes}m · P{item.priority_percent}
        </span>
      </div>

      <div
        className={`review-card flip-card${revealed ? " flipped" : ""}`}
        style={{ ["--card-accent" as string]: item.track_color }}
      >
        <div className="flip-card-inner">
          <div className="flip-card-face flip-card-front review-card-face">
            <div className="meta-row">
              <span className="badge track">
                <span className="dot" style={{ background: item.track_color }} />
                {item.track_name}
              </span>
              <span className="badge">{item.kind === "new" ? "Learn" : "Review"}</span>
            </div>
            <h2 className="review-title">{item.material_title}</h2>
            <div className="review-prompt">
              <p>Recall the concept, pattern, or approach.</p>
              <div className="review-prompt-actions">
                {item.material_url && (() => {
                  const a = resourceAction(item.resource_type);
                  return (
                    <a
                      href={item.material_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`btn primary practice-btn ${a.className}`}
                    >
                      <span aria-hidden className="resource-icon">{a.icon}</span>
                      {a.label} ↗
                    </a>
                  );
                })()}
                <button className="primary reveal-btn" onClick={() => setRevealed(true)}>
                  Show Answer <kbd>Space</kbd>
                </button>
              </div>
            </div>
          </div>

          <div className="flip-card-face flip-card-back review-card-face">
            <div className="meta-row">
              <span className="badge track">
                <span className="dot" style={{ background: item.track_color }} />
                {item.track_name}
              </span>
              <span className="badge">{item.state}</span>
            </div>
            <h2 className="review-title">{item.material_title}</h2>
            <div className="review-answer">
              {item.block_label && <div className="review-block-label">{item.block_label}</div>}
              {item.material_content ? (
                <pre className="content-block">{item.material_content}</pre>
              ) : (
                <p className="muted">No content stored — recall from memory.</p>
              )}
              {item.material_url && (() => {
                const a = resourceAction(item.resource_type);
                return (
                  <a
                    href={item.material_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`btn primary practice-btn ${a.className}`}
                  >
                    <span aria-hidden className="resource-icon">{a.icon}</span>
                    {a.label} ↗
                  </a>
                );
              })()}
              <div className="fsrs-meta">
                {item.stability != null && <span>S {item.stability.toFixed(1)}d</span>}
                {item.retrievability != null && (
                  <span>R {(item.retrievability * 100).toFixed(0)}%</span>
                )}
                {item.difficulty != null && <span>D {item.difficulty.toFixed(1)}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {revealed && (
        <div className="rating-panel">
          <p className="rating-hint">
            How well did you recall? Press <kbd>1</kbd>–<kbd>4</kbd>
          </p>
          <div className="rating-row">
            {RATINGS.map((r) => (
              <button
                key={r.key}
                className={r.className}
                disabled={submitting}
                onClick={() => handleReview(r.key)}
              >
                <span className="rating-label">{r.label}</span>
                <kbd>{r.shortcut}</kbd>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
