"use client";

import { useEffect, useRef, useState } from "react";
import { resourceAction } from "@/lib/resourceAction";
import { briefForItem, type BriefItem } from "@/lib/parseMaterialNotes";
import { trackAccent } from "@/lib/trackColors";
import { api, type QueueItem } from "@/lib/api";

const RATINGS = [
  { key: "AGAIN", label: "Again", shortcut: "1", className: "again", hint: "Forgot — review soon" },
  { key: "HARD", label: "Hard", shortcut: "2", className: "hard", hint: "Struggled" },
  { key: "GOOD", label: "Good", shortcut: "3", className: "good", hint: "Got it" },
  { key: "EASY", label: "Easy", shortcut: "4", className: "easy", hint: "Effortless" },
] as const;

export type Rating = (typeof RATINGS)[number]["key"];

function SessionPhaseBar({ revealed }: { revealed: boolean }) {
  const steps = [
    { id: "work" as const, label: "Work", num: 1 },
    { id: "recall" as const, label: "Recall", num: 2 },
    { id: "rate" as const, label: "Rate", num: 3 },
  ];

  return (
    <nav className="session-phase" aria-label="Session steps">
      {steps.map((step, i) => {
        const done = revealed ? i === 0 : false;
        const active = revealed ? i >= 1 : i === 0;

        return (
          <div
            key={step.id}
            className={`session-phase-step${done ? " done" : ""}${active ? " active" : ""}`}
          >
            <span className="session-phase-num" aria-hidden>
              {done ? "✓" : step.num}
            </span>
            <span className="session-phase-label">{step.label}</span>
            {i < steps.length - 1 && <span className="session-phase-connector" aria-hidden />}
          </div>
        );
      })}
    </nav>
  );
}

function MaterialBrief({
  item,
  revealed,
}: {
  item: BriefItem;
  revealed: boolean;
}) {
  const parsed = briefForItem(item);
  const workSections = parsed.sections.filter((s) => s.key !== "recall");
  const recallSection = parsed.sections.find((s) => s.key === "recall");

  return (
    <div className="session-brief">
      <div className="session-work-grid">
        {workSections.map((section) => {
          const ordered = section.key === "do";
          const ListTag = ordered ? "ol" : "ul";
          return (
            <div
              key={section.key}
              className={`session-section session-section-${section.key}`}
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

      {recallSection && (
        <div
          className={`session-section session-section-recall${
            revealed ? " session-section-recall-open" : " session-section-muted"
          }`}
        >
          <div className="session-section-label">
            {recallSection.title}
            {!revealed && <span className="session-section-lock"> · locked</span>}
          </div>
          {revealed ? (
            <ul className="session-section-list">
              {recallSection.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="session-section-hint">
              Finish the deliverables above, then reveal to unlock self-test prompts.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SessionPrimaryAction({ item }: { item: QueueItem }) {
  if (!item.material_url) return null;
  const a = resourceAction(item.resource_type);

  return (
    <a
      href={item.material_url}
      target="_blank"
      rel="noreferrer"
      className="session-action-hero"
    >
      <span className="session-action-icon" aria-hidden>
        {a.icon}
      </span>
      <span className="session-action-copy">
        <span className="session-action-label">{a.label}</span>
        <span className="session-action-meta">
          ~{item.estimated_minutes} min · opens in new tab
        </span>
      </span>
      <span className="session-action-arrow" aria-hidden>
        ↗
      </span>
    </a>
  );
}

/** Body of the active session card — title, brief, primary action. */
export function SessionCard({
  item,
  revealed,
  nextTitle,
}: {
  item: QueueItem;
  revealed: boolean;
  nextTitle?: string | null;
}) {
  const accent = trackAccent(item.track_slug, item.track_color);
  const briefItem: BriefItem = {
    material_title: item.material_title,
    material_content: item.material_content,
    material_url: item.material_url,
    resource_type: item.resource_type,
    kind: item.kind,
    estimated_minutes: item.estimated_minutes,
  };

  return (
    <section className="session-card" style={{ ["--track-color" as string]: accent }}>
      <SessionPhaseBar revealed={revealed} />

      <div className="session-meta">
        <span className="pill track">
          <span className="track-dot" aria-hidden /> {item.track_name}
        </span>
        <span className="pill">{item.kind === "new" ? "Learn" : "Review"}</span>
        {item.block_label && <span className="pill muted">{item.block_label}</span>}
        <span className="pill muted">{item.estimated_minutes}m</span>
      </div>

      <h1 className="session-card-title">{item.material_title}</h1>

      <SessionPrimaryAction item={item} />
      <MaterialBrief item={briefItem} revealed={revealed} />

      {revealed && (item.stability != null || item.retrievability != null) && (
        <div className="session-fsrs">
          {item.stability != null && (
            <span>
              <strong>S</strong>
              {item.stability.toFixed(1)}d
            </span>
          )}
          {item.retrievability != null && (
            <span>
              <strong>R</strong>
              {(item.retrievability * 100).toFixed(0)}%
            </span>
          )}
          {item.difficulty != null && (
            <span>
              <strong>D</strong>
              {item.difficulty.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {nextTitle && (
        <p className="session-up-next">
          Up next · <span>{nextTitle}</span>
        </p>
      )}
    </section>
  );
}

/** Thin progress bar for the session header. */
export function SessionHeaderProgress({ index, total }: { index: number; total: number }) {
  if (total <= 0) return null;
  const pct = Math.round((index / total) * 100);
  return (
    <div
      className="session-bar-progress"
      role="progressbar"
      aria-valuenow={index}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Card ${index} of ${total}`}
    >
      <div className="session-bar-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Sticky session footer — reveal CTA or FSRS ratings. */
export function SessionFooter({
  revealed,
  submitting,
  onReveal,
  onRate,
}: {
  revealed: boolean;
  submitting: boolean;
  onReveal: () => void;
  onRate: (r: Rating) => void;
}) {
  if (!revealed) {
    return (
      <footer className="session-footer session-footer-work">
        <div className="session-footer-inner">
          <p className="session-footer-hint">Done with deliverables?</p>
          <button
            type="button"
            className="v2-btn primary session-reveal-btn"
            onClick={onReveal}
          >
            Show recall
            <kbd>Space</kbd>
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="session-footer session-footer-rate">
      <SessionDock enabled submitting={submitting} onRate={onRate} />
    </footer>
  );
}

/** Optional time log — lives in the header, not the footer. */
export function SessionLogMenu({
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

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
    <div className={`session-log-menu${open ? " open" : ""}${saved ? " saved" : ""}`} ref={panelRef}>
      <button
        type="button"
        className="session-log-menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Log time on external resources"
      >
        {saved ? "Logged ✓" : "Log time"}
      </button>

      {open && (
        <div className="session-log-menu-panel">
          <p className="session-log-menu-title">{materialTitle}</p>
          <p className="session-log-hint">
            Track minutes spent on LeetCode, videos, or docs for this card.
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
          </div>

          <label className="session-log-notes">
            <span className="session-log-field-label">Notes (optional)</span>
            <textarea
              rows={2}
              placeholder="What did you finish?"
              value={notes}
              onChange={(e) => {
                setSaved(false);
                setNotes(e.target.value);
              }}
            />
          </label>

          <button
            type="button"
            className="v2-btn primary sm session-log-submit"
            disabled={saving}
            onClick={logSession}
          >
            {saved ? "Saved" : saving ? "Saving…" : "Save log"}
          </button>
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
      <p className="session-dock-label">How well did you recall?</p>
      <div className="session-dock-inner">
        {RATINGS.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`rating-btn ${r.className}`}
            disabled={!enabled || submitting}
            onClick={() => onRate(r.key)}
            title={r.hint}
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
