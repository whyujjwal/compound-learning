"use client";

import { useEffect, useState } from "react";
import { resourceAction } from "@/lib/resourceAction";
import { parseMaterialNotes } from "@/lib/parseMaterialNotes";
import { trackAccent } from "@/lib/trackColors";
import { api, type QueueItem } from "@/lib/api";

const RATINGS = [
  { key: "AGAIN", label: "Again", shortcut: "1", className: "again" },
  { key: "HARD", label: "Hard", shortcut: "2", className: "hard" },
  { key: "GOOD", label: "Good", shortcut: "3", className: "good" },
  { key: "EASY", label: "Easy", shortcut: "4", className: "easy" },
] as const;

export type Rating = (typeof RATINGS)[number]["key"];

function MaterialBrief({
  content,
  revealed,
}: {
  content: string | null;
  revealed: boolean;
}) {
  const parsed = parseMaterialNotes(content);

  if (!parsed.structured) {
    if (!parsed.legacy) return null;
    return (
      <div className="session-brief">
        <div className="session-section">
          <div className="session-section-label">About</div>
          <p className="session-section-body">{parsed.legacy}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="session-brief">
      {parsed.sections.map((section) => {
        if (section.key === "recall" && !revealed) {
          return (
            <div key={section.key} className="session-section session-section-muted">
              <div className="session-section-label">{section.title}</div>
              <p className="session-section-hint">
                Finish deliverables, then Reveal to unlock self-test questions.
              </p>
            </div>
          );
        }
        if (section.key === "recall" && !section.lines.length) return null;

        const ordered = section.key === "do";
        const ListTag = ordered ? "ol" : "ul";

        return (
          <div
            key={section.key}
            className={`session-section session-section-${section.key}${section.key === "recall" && revealed ? " session-section-recall-open" : ""}`}
          >
            <div className="session-section-label">{section.title}</div>
            <ListTag className="session-section-list">
              {section.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ListTag>
          </div>
        );
      })}
    </div>
  );
}

/** Body of the active session card — title, content, FSRS metadata. */
export function SessionCard({
  item,
  revealed,
  onReveal,
  index,
  total,
}: {
  item: QueueItem;
  revealed: boolean;
  onReveal: () => void;
  index?: number;
  total?: number;
}) {
  const accent = trackAccent(item.track_slug, item.track_color);
  const a = resourceAction(item.resource_type);
  const showProgress = index != null && total != null && total > 0;

  return (
    <section className="session-card" style={{ ["--track-color" as string]: accent }}>
      {showProgress && (
        <div className="session-progress" aria-label={`Card ${index} of ${total}`}>
          <div className="session-progress-bar">
            <div
              className="session-progress-fill"
              style={{ width: `${Math.round((index / total) * 100)}%` }}
            />
          </div>
          <span className="session-progress-label">
            {index} / {total}
          </span>
        </div>
      )}
      <div className="session-meta">
        <span className="pill track">
          <span className="track-dot" aria-hidden /> {item.track_name}
        </span>
        <span className="pill">{item.kind === "new" ? "Learn" : "Review"}</span>
        {item.block_label && <span className="pill muted">{item.block_label}</span>}
        <span className="pill muted">{item.estimated_minutes}m</span>
      </div>

      <h1 className="session-card-title">{item.material_title}</h1>

      <MaterialBrief content={item.material_content} revealed={revealed} />

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
            Complete the deliverables above, then self-test with Reveal. Press{" "}
            <kbd>Space</kbd>.
          </p>
          <button type="button" className="v2-btn session-reveal" onClick={onReveal}>
            Show recall <kbd style={{ marginLeft: 6, fontSize: 10 }}>Space</kbd>
          </button>
        </>
      ) : (
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
      )}
    </section>
  );
}

/** Sticky session footer — practice log + FSRS rating dock. */
export function SessionFooter({
  materialId,
  materialTitle,
  revealed,
  submitting,
  onRate,
}: {
  materialId: string;
  materialTitle: string;
  revealed: boolean;
  submitting: boolean;
  onRate: (r: Rating) => void;
}) {
  return (
    <footer className="session-footer">
      <SessionLogPanel materialId={materialId} materialTitle={materialTitle} />
      <SessionDock enabled={revealed} submitting={submitting} onRate={onRate} />
    </footer>
  );
}

function SessionLogPanel({
  materialId,
  materialTitle,
}: {
  materialId: string;
  materialTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function logSession() {
    setSaving(true);
    try {
      await api.logSession({
        material_id: materialId,
        duration_minutes: minutes,
        self_rating: rating,
        notes: notes || undefined,
        completion_status: "COMPLETED",
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`session-log${open ? " session-log-open" : ""}${saved ? " session-log-saved" : ""}`}>
      <button
        type="button"
        className="session-log-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="session-log-toggle-label">Log practice</span>
        <span className="session-log-toggle-meta">{materialTitle}</span>
        <span className="session-log-chevron" aria-hidden>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="session-log-body">
          <p className="session-log-hint">
            Track time spent on external resources (LeetCode, videos, docs) for this material.
          </p>
          <div className="session-log-fields">
            <label className="session-log-field">
              <span className="session-log-field-label">Minutes</span>
              <input
                type="number"
                min={1}
                max={240}
                value={minutes}
                onChange={(e) => {
                  setSaved(false);
                  setMinutes(Number(e.target.value));
                }}
              />
            </label>

            <div className="session-log-field session-log-confidence">
              <span className="session-log-field-label">Confidence</span>
              <div className="session-log-confidence-btns" role="group" aria-label="Confidence 1 to 5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`session-log-confidence-btn${rating === n ? " active" : ""}`}
                    aria-pressed={rating === n}
                    onClick={() => {
                      setSaved(false);
                      setRating(n);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="v2-btn primary sm session-log-submit"
              disabled={saving}
              onClick={logSession}
            >
              {saved ? "Logged ✓" : saving ? "Saving…" : "Log session"}
            </button>
          </div>

          <label className="session-log-notes">
            <span className="session-log-field-label">Notes (optional)</span>
            <textarea
              rows={2}
              placeholder="What did you finish? Link or brief summary."
              value={notes}
              onChange={(e) => {
                setSaved(false);
                setNotes(e.target.value);
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

/** FSRS rating buttons inside the session footer. */
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
      <p className="session-dock-label">
        {enabled ? "Rate your recall" : "Reveal to unlock ratings"}
      </p>
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
