"use client";

/**
 * BlockItemCard — a single expandable card row within the Block page's queue list.
 *
 * Three visual states:
 *   done   — grayed-out, checkmark, not expandable
 *   active — highlighted, expanded by default, full interactivity
 *   todo   — muted, not interactive yet
 *
 * Flow for the active card:
 *   1. Card expands with resource link + brief (work sections visible, recall locked)
 *   2. User clicks "Done working" (or presses Space) → doneWorking = true
 *   3. Recall section unlocks, GradeBar appears
 *   4. User selects a grade (or presses 1–4) → onRate fires
 */

import type { QueueItem } from "@/lib/api/types";
import { briefForItem, type BriefItem } from "@/lib/parseMaterialNotes";
import { resourceAction } from "@/lib/resourceAction";
import { GradeBar } from "./GradeBar";
import type { GradeKey } from "./types";

type ItemStatus = "done" | "active" | "todo";

function itemStatus(index: number, currentIndex: number): ItemStatus {
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "active";
  return "todo";
}

interface BlockItemCardProps {
  item: QueueItem;
  index: number;
  currentIndex: number;
  expanded: boolean;
  doneWorking: boolean;
  submitting: boolean;
  onToggle: () => void;
  onDoneWorking: () => void;
  onRate: (rating: GradeKey) => void;
}

export function BlockItemCard({
  item,
  index,
  currentIndex,
  expanded,
  doneWorking,
  submitting,
  onToggle,
  onDoneWorking,
  onRate,
}: BlockItemCardProps) {
  const status = itemStatus(index, currentIndex);
  const canInteract = status === "active";
  const showRecall = canInteract && doneWorking;
  const action = item.material_url ? resourceAction(item.resource_type) : null;

  const brief: BriefItem = {
    material_title: item.material_title,
    material_content: item.material_content,
    material_url: item.material_url,
    resource_type: item.resource_type,
    kind: item.kind,
    estimated_minutes: item.estimated_minutes,
  };
  const parsed = briefForItem(brief);
  const workSections = parsed.sections.filter((s) => s.key !== "recall");
  const recallSection = parsed.sections.find((s) => s.key === "recall");

  // Row accent colors by status
  const borderColor =
    status === "active"
      ? "var(--accent)"
      : "var(--hairline)";
  const rowOpacity = status === "todo" ? 0.45 : 1;

  return (
    <article
      id={`item-${item.card_id}`}
      style={{
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        background: status === "active" ? "var(--panel)" : "transparent",
        opacity: rowOpacity,
        transition: "opacity 150ms, border-color 150ms, background 150ms",
        overflow: "hidden",
      }}
    >
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "11px 14px",
          background: "transparent",
          border: "none",
          cursor: status === "todo" ? "default" : "pointer",
          textAlign: "left",
          color: "inherit",
        }}
      >
        {/* Status indicator */}
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: `1.5px solid ${status === "done" ? "var(--ok)" : status === "active" ? "var(--accent)" : "var(--hairline)"}`,
            background: status === "done" ? "color-mix(in srgb, var(--ok) 10%, transparent)" : "transparent",
            color: status === "done" ? "var(--ok)" : status === "active" ? "var(--accent)" : "var(--muted)",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            transition: "all 150ms",
          }}
        >
          {status === "done" ? "✓" : index + 1}
        </span>

        {/* Title */}
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: status === "active" ? 600 : 400,
            color: status === "done" ? "var(--muted)" : "var(--text)",
            lineHeight: 1.4,
            textDecoration: status === "done" ? "line-through" : "none",
          }}
        >
          {item.material_title}
        </span>

        {/* Meta */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--muted)",
            flexShrink: 0,
          }}
        >
          {action && <span aria-hidden>{action.icon}</span>}
          <span>{item.estimated_minutes}m</span>
          <span aria-hidden style={{ fontSize: 10, opacity: 0.5 }}>
            {expanded ? "▾" : "▸"}
          </span>
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div
          style={{
            padding: "0 14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            borderTop: "1px solid var(--hairline)",
          }}
        >
          {/* External resource link */}
          {action && item.material_url && (
            <a
              href={item.material_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 5,
                border: "1px solid var(--hairline)",
                background: "var(--canvas)",
                color: "var(--text)",
                textDecoration: "none",
                marginTop: 14,
                transition: "background 100ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--overlay-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--canvas)";
              }}
            >
              <span aria-hidden style={{ fontSize: 16, color: "var(--muted)" }}>{action.icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 500 }}>{action.label}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                  ~{item.estimated_minutes} min · opens in new tab
                </span>
              </span>
              <span aria-hidden style={{ color: "var(--muted)" }}>↗</span>
            </a>
          )}

          {/* Work sections */}
          {workSections.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {workSections.map((section) => {
                const ListTag = section.key === "do" ? "ol" : "ul";
                return (
                  <div key={section.key}>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--muted)",
                        marginBottom: 4,
                      }}
                    >
                      {section.title}
                    </p>
                    <ListTag
                      style={{
                        paddingLeft: section.key === "do" ? 18 : 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        fontSize: 13,
                        color: "var(--text)",
                        lineHeight: 1.5,
                      }}
                    >
                      {section.lines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ListTag>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recall section */}
          {recallSection && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 5,
                border: "1px solid var(--hairline)",
                background: showRecall ? "color-mix(in srgb, var(--ok) 5%, transparent)" : "transparent",
                opacity: showRecall ? 1 : 0.55,
                transition: "background 200ms, opacity 200ms",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: showRecall ? "var(--ok)" : "var(--muted)",
                  marginBottom: showRecall ? 6 : 0,
                }}
              >
                {recallSection.title}
                {!showRecall && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}> · locked</span>}
              </p>
              {showRecall ? (
                <ul
                  style={{
                    paddingLeft: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    fontSize: 13,
                    color: "var(--text)",
                    lineHeight: 1.5,
                  }}
                >
                  {recallSection.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>
                  Tap Done working to unlock recall prompts.
                </p>
              )}
            </div>
          )}

          {/* "Done working" CTA */}
          {canInteract && !doneWorking && (
            <button
              type="button"
              onClick={onDoneWorking}
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                borderRadius: 4,
                border: "1px solid transparent",
                background: "var(--accent)",
                color: "#ffffff",
                fontSize: 13,
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
              Done working
            </button>
          )}

          {/* Grade bar */}
          {showRecall && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                How well did you recall?
              </p>
              <GradeBar enabled={!submitting} submitting={submitting} onRate={onRate} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
