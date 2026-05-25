"use client";

import { useEffect } from "react";
import { resourceAction } from "@/lib/resourceAction";
import { trackAccent } from "@/lib/trackColors";
import type { QueueItem } from "@/lib/api";

const RATINGS = [
  { key: "AGAIN", label: "Again", shortcut: "1", className: "again" },
  { key: "HARD", label: "Hard", shortcut: "2", className: "hard" },
  { key: "GOOD", label: "Good", shortcut: "3", className: "good" },
  { key: "EASY", label: "Easy", shortcut: "4", className: "easy" },
] as const;

export type Rating = (typeof RATINGS)[number]["key"];

/** Body of the active session card — title, content, FSRS metadata. */
export function SessionCard({
  item,
  revealed,
  onReveal,
}: {
  item: QueueItem;
  revealed: boolean;
  onReveal: () => void;
}) {
  const accent = trackAccent(item.track_slug, item.track_color);
  const a = resourceAction(item.resource_type);

  return (
    <section className="session-card" style={{ ["--track-color" as string]: accent }}>
      <div className="session-meta">
        <span className="pill track">
          <span className="track-dot" aria-hidden /> {item.track_name}
        </span>
        <span className="pill">{item.kind === "new" ? "Learn" : "Review"}</span>
        {item.block_label && <span className="pill muted">{item.block_label}</span>}
        <span className="pill muted">{item.estimated_minutes}m</span>
      </div>

      <h1 className="session-card-title">{item.material_title}</h1>

      {item.material_url && (
        <div>
          <a
            href={item.material_url}
            target="_blank"
            rel="noreferrer"
            className="v2-btn primary"
          >
            <span aria-hidden style={{ fontSize: 11 }}>{a.icon}</span>
            {a.label} ↗
          </a>
        </div>
      )}

      {!revealed ? (
        <>
          <p className="session-prompt">
            Recall the concept, pattern, or approach. Press <kbd>Space</kbd> when ready.
          </p>
          <button type="button" className="v2-btn session-reveal" onClick={onReveal}>
            Show answer <kbd style={{ marginLeft: 6, fontSize: 10 }}>Space</kbd>
          </button>
        </>
      ) : (
        <>
          {item.material_content ? (
            <pre className="session-content">{item.material_content}</pre>
          ) : (
            <p className="session-prompt">No content stored — recall from memory.</p>
          )}

          <div className="session-fsrs">
            {item.stability != null && (
              <span><strong>S</strong>{item.stability.toFixed(1)}d</span>
            )}
            {item.retrievability != null && (
              <span><strong>R</strong>{(item.retrievability * 100).toFixed(0)}%</span>
            )}
            {item.difficulty != null && (
              <span><strong>D</strong>{item.difficulty.toFixed(1)}</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/** Sticky rating dock — rendered as a separate grid row in the bare shell. */
export function SessionDock({
  enabled,
  submitting,
  onRate,
}: {
  enabled: boolean;
  submitting: boolean;
  onRate: (r: Rating) => void;
}) {
  return (
    <div className="session-dock">
      <div className="session-dock-inner">
        {RATINGS.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`rating-btn ${r.className}`}
            disabled={!enabled || submitting}
            onClick={() => onRate(r.key)}
          >
            <span>{r.label}</span>
            <span className="rating-btn-key">{r.shortcut}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Keyboard glue — bound by the page. */
export function useSessionKeys(
  revealed: boolean,
  enabled: boolean,
  onReveal: () => void,
  onRate: (r: Rating) => void
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === " " && !revealed) {
        e.preventDefault();
        onReveal();
        return;
      }
      const r = RATINGS.find((rt) => rt.shortcut === e.key);
      if (r && revealed && enabled) onRate(r.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, enabled, onReveal, onRate]);
}
