"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BlockEntry, QueueItem } from "@/lib/api/types";
import { Button } from "@/components/primitives";

// Track hue from color string — produces a consistent subtle accent
function trackHue(color: string): string {
  // if hex, use it; fallback to accent
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return "var(--accent)";
}

function ItemTypeTag({ kind }: { kind: "review" | "new" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 18,
        padding: "0 6px",
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.02em",
        background: kind === "new" ? "var(--accent-soft)" : "var(--overlay-hover)",
        color: kind === "new" ? "var(--accent)" : "var(--muted)",
        flexShrink: 0,
      }}
    >
      {kind === "new" ? "new" : "review"}
    </span>
  );
}

function QueueItemRow({
  item,
  index,
}: {
  item: QueueItem;
  index: number;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 0",
        borderBottom: "1px solid var(--hairline)",
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--muted)",
          fontWeight: 500,
          minWidth: 18,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 14,
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={item.material_title}
      >
        {item.material_title}
      </span>
      <ItemTypeTag kind={item.kind} />
      <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>
        {item.estimated_minutes}m
      </span>
    </li>
  );
}

interface QueueBlockProps {
  block: BlockEntry;
  extra: QueueItem[];
  completed: boolean;
  onPushMore: (slug: string) => Promise<void>;
  isFirst?: boolean;
}

export function QueueBlock({ block, extra, completed, onPushMore, isFirst }: QueueBlockProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const allItems = [...block.reviews, ...block.new_items, ...extra];
  const isEmpty = allItems.length === 0;
  const accentColor = trackHue(block.track_color);

  const handleStart = useCallback(() => {
    router.push(`/block/${block.slot}`);
  }, [router, block.slot]);

  const handlePushMore = useCallback(async () => {
    setLoadingMore(true);
    await onPushMore(block.track_slug);
    setLoadingMore(false);
  }, [onPushMore, block.track_slug]);

  return (
    <div
      style={{
        borderRadius: 6,
        border: "1px solid var(--hairline)",
        background: completed ? "transparent" : "var(--canvas)",
        opacity: isEmpty ? 0.6 : 1,
        transition: "background var(--dur-fast), border-color var(--dur-fast)",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!isEmpty) {
          (e.currentTarget as HTMLDivElement).style.borderColor =
            "rgba(35,131,226,0.3)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--hairline)";
      }}
    >
      {/* Block header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 16px",
          borderBottom: expanded ? "1px solid var(--hairline)" : "none",
          cursor: isEmpty ? "default" : "pointer",
        }}
        onClick={() => !isEmpty && setExpanded((v) => !v)}
        role={!isEmpty ? "button" : undefined}
        tabIndex={!isEmpty ? 0 : undefined}
        onKeyDown={(e) => {
          if (!isEmpty && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        aria-expanded={!isEmpty ? expanded : undefined}
      >
        {/* Track color dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accentColor,
            flexShrink: 0,
          }}
        />

        {/* Track info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: completed ? "var(--muted)" : "var(--text)",
              }}
            >
              {completed && (
                <span
                  style={{
                    color: "var(--ok)",
                    marginRight: 6,
                    fontSize: 12,
                  }}
                  aria-label="Completed"
                >
                  ✓
                </span>
              )}
              {block.track_name}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {block.slot_label}
            </span>
          </div>

          {!isEmpty && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 3,
                flexWrap: "wrap",
              }}
            >
              {block.reviews.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  <strong style={{ color: "var(--text)", fontWeight: 500 }}>
                    {block.reviews.length}
                  </strong>{" "}
                  review{block.reviews.length !== 1 ? "s" : ""}
                </span>
              )}
              {(block.new_items.length + extra.length) > 0 && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  <strong style={{ color: "var(--accent)", fontWeight: 500 }}>
                    {block.new_items.length + extra.length}
                  </strong>{" "}
                  new
                </span>
              )}
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                ~{block.planned_minutes}m
              </span>
            </div>
          )}

          {isEmpty && (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Nothing queued
            </span>
          )}
        </div>

        {/* Expand chevron */}
        {!isEmpty && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
            style={{
              color: "var(--muted)",
              flexShrink: 0,
              transition: "transform var(--dur-fast)",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path
              d="M2.5 5L7 9.5L11.5 5"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* CTA */}
        <Button
          variant={isFirst && !completed && !isEmpty ? "primary" : "secondary"}
          size="sm"
          disabled={isEmpty}
          onClick={(e) => {
            e.stopPropagation();
            handleStart();
          }}
          style={{ flexShrink: 0 }}
        >
          {completed ? "Again" : "Open"}
          {!completed && !isEmpty && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path
                d="M1.5 5H8.5M5.5 2L8.5 5L5.5 8"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </Button>
      </div>

      {/* Expanded item list */}
      {expanded && !isEmpty && (
        <div style={{ padding: "0 16px 14px 16px" }}>
          <ul
            style={{ listStyle: "none", padding: 0, margin: 0 }}
            aria-label={`Items in ${block.track_name}`}
          >
            {allItems.slice(0, 8).map((item, i) => (
              <QueueItemRow key={item.card_id} item={item} index={i} />
            ))}
          </ul>

          {allItems.length > 8 && (
            <p style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0 4px" }}>
              +{allItems.length - 8} more items
            </p>
          )}

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              loading={loadingMore}
              onClick={handlePushMore}
            >
              Load more
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
