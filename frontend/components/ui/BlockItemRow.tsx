"use client";

import { briefForItem, type BriefItem } from "@/lib/parseMaterialNotes";
import { resourceAction } from "@/lib/resourceAction";
import type { QueueItem } from "@/lib/api";

const RATINGS = [
  { key: "AGAIN", label: "Again", shortcut: "1", className: "again" },
  { key: "HARD", label: "Hard", shortcut: "2", className: "hard" },
  { key: "GOOD", label: "Good", shortcut: "3", className: "good" },
  { key: "EASY", label: "Easy", shortcut: "4", className: "easy" },
] as const;

export type BlockRating = (typeof RATINGS)[number]["key"];

type ItemStatus = "done" | "active" | "todo";

function itemStatus(index: number, currentIndex: number): ItemStatus {
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "active";
  return "todo";
}

function BlockBrief({ item, showRecall }: { item: QueueItem; showRecall: boolean }) {
  const brief: BriefItem = {
    material_title: item.material_title,
    material_content: item.material_content,
    material_url: item.material_url,
    resource_type: item.resource_type,
    kind: item.kind,
    estimated_minutes: item.estimated_minutes,
  };
  const parsed = briefForItem(brief);
  const work = parsed.sections.filter((s) => s.key !== "recall");
  const recall = parsed.sections.find((s) => s.key === "recall");

  return (
    <div className="block-item-brief">
      <div className="block-item-work-grid">
        {work.map((section) => {
          const ListTag = section.key === "do" ? "ol" : "ul";
          return (
            <div key={section.key} className={`session-section session-section-${section.key}`}>
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
      {recall && (
        <div
          className={`session-section session-section-recall${
            showRecall ? " session-section-recall-open" : " session-section-muted"
          }`}
        >
          <div className="session-section-label">{recall.title}</div>
          {showRecall ? (
            <ul className="session-section-list">
              {recall.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="session-section-hint">Tap Done working to unlock recall prompts.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function BlockItemRow({
  item,
  index,
  currentIndex,
  expanded,
  doneWorking,
  submitting,
  onToggle,
  onDoneWorking,
  onRate,
}: {
  item: QueueItem;
  index: number;
  currentIndex: number;
  expanded: boolean;
  doneWorking: boolean;
  submitting: boolean;
  onToggle: () => void;
  onDoneWorking: () => void;
  onRate: (rating: BlockRating) => void;
}) {
  const status = itemStatus(index, currentIndex);
  const a = resourceAction(item.resource_type);
  const canInteract = status === "active";
  const showRecall = canInteract && doneWorking;

  return (
    <article
      id={`item-${item.card_id}`}
      className={`block-item${expanded ? " expanded" : ""}${status === "done" ? " done" : ""}${
        status === "active" ? " active" : ""
      }`}
    >
      <button type="button" className="block-item-header" onClick={onToggle}>
        <span className="block-item-status" aria-hidden>
          {status === "done" ? "✓" : index + 1}
        </span>
        <span className="block-item-title">{item.material_title}</span>
        <span className="block-item-meta">
          <span className="block-item-type" aria-hidden>
            {a.icon}
          </span>
          <span>{item.estimated_minutes}m</span>
        </span>
        <span className="block-item-chevron" aria-hidden>
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div className="block-item-body">
          {item.material_url && (
            <a
              href={item.material_url}
              target="_blank"
              rel="noreferrer"
              className="session-action-hero block-item-action"
            >
              <span className="session-action-icon" aria-hidden>
                {a.icon}
              </span>
              <span className="session-action-copy">
                <span className="session-action-label">{a.label}</span>
                <span className="session-action-meta">~{item.estimated_minutes} min · opens in new tab</span>
              </span>
              <span className="session-action-arrow" aria-hidden>
                ↗
              </span>
            </a>
          )}

          <BlockBrief item={item} showRecall={showRecall} />

          {canInteract && !doneWorking && (
            <button type="button" className="v2-btn primary block-item-done-btn" onClick={onDoneWorking}>
              Done working
            </button>
          )}

          {showRecall && (
            <div className="block-item-rate">
              <p className="session-dock-label">How well did you recall?</p>
              <div className="session-dock-inner">
                {RATINGS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={`rating-btn ${r.className}`}
                    disabled={submitting}
                    onClick={() => onRate(r.key)}
                  >
                    <span>{r.label}</span>
                    <span className="rating-btn-key">{r.shortcut}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export { RATINGS as BLOCK_RATINGS };
