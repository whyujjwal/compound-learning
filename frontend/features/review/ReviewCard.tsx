"use client";

/**
 * ReviewCard — the main study surface for a single queue item.
 *
 * Renders:
 *   - Material title (large, serif-weight sans)
 *   - Track + kind + time pill strip
 *   - Resource action button (external link) when a URL is present
 *   - Structured brief (Watch/Do/Deliverable from parseMaterialNotes)
 *   - Recall section — locked until `revealed`
 *   - FSRS metadata strip (S / R / D) after reveal
 *   - "Up next" whisper
 *
 * Does NOT own grade buttons — the parent page attaches GradeBar below.
 * Pure display: receives `revealed` as a prop, emits nothing.
 */

import type { QueueItem } from "@/lib/api/types";
import { briefForItem, type BriefItem } from "@/lib/parseMaterialNotes";
import { resourceAction } from "@/lib/resourceAction";
import { trackAccent } from "@/lib/trackColors";

interface ReviewCardProps {
  item: QueueItem;
  revealed: boolean;
  nextTitle?: string | null;
}

export function ReviewCard({ item, revealed, nextTitle }: ReviewCardProps) {
  const accent = trackAccent(item.track_slug, item.track_color);
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
  const action = item.material_url ? resourceAction(item.resource_type) : null;

  return (
    <article
      style={{
        width: "100%",
        maxWidth: 680,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Meta pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px",
            borderRadius: 3,
            fontSize: 12,
            fontWeight: 500,
            background: `color-mix(in srgb, ${accent} 12%, transparent)`,
            color: accent,
            border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: accent,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          {item.track_name}
        </span>
        <Pill>{item.kind === "new" ? "Learn" : "Review"}</Pill>
        {item.block_label && <Pill muted>{item.block_label}</Pill>}
        <Pill muted>{item.estimated_minutes}m</Pill>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: "clamp(22px, 4vw, 30px)",
          fontWeight: 700,
          lineHeight: 1.25,
          color: "var(--text)",
          letterSpacing: "-0.01em",
        }}
      >
        {item.material_title}
      </h1>

      {/* External resource CTA */}
      {action && item.material_url && (
        <a
          href={item.material_url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 6,
            border: "1px solid var(--hairline)",
            background: "var(--panel)",
            color: "var(--text)",
            textDecoration: "none",
            transition: "background 100ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--overlay-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--panel)";
          }}
        >
          <span
            aria-hidden
            style={{ fontSize: 18, color: "var(--muted)", lineHeight: 1, flexShrink: 0 }}
          >
            {action.icon}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text)" }}
            >
              {action.label}
            </span>
            <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
              ~{item.estimated_minutes} min · opens in new tab
            </span>
          </span>
          <span aria-hidden style={{ color: "var(--muted)", fontSize: 16 }}>
            ↗
          </span>
        </a>
      )}

      {/* Structured brief — work sections */}
      {workSections.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {workSections.map((section) => {
            const ListTag = section.key === "do" ? "ol" : "ul";
            return (
              <div
                key={section.key}
                style={{
                  padding: "12px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--hairline)",
                  background: "var(--panel)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 8,
                  }}
                >
                  {section.title}
                </p>
                <ListTag
                  style={{
                    paddingLeft: section.key === "do" ? 18 : 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    fontSize: 14,
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

      {/* Recall section — locked until revealed */}
      {recallSection && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 6,
            border: `1px solid ${revealed ? "var(--hairline)" : "var(--hairline)"}`,
            background: revealed ? "var(--panel)" : "transparent",
            opacity: revealed ? 1 : 0.6,
            transition: "background 200ms, opacity 200ms",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: revealed ? "var(--ok)" : "var(--muted)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {recallSection.title}
            {!revealed && (
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11 }}>
                · locked
              </span>
            )}
          </p>

          {revealed ? (
            <ul
              style={{
                paddingLeft: 14,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 14,
                color: "var(--text)",
                lineHeight: 1.5,
              }}
            >
              {recallSection.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Complete the steps above, then press <kbd style={{ fontFamily: "inherit", fontSize: 12 }}>Space</kbd> to unlock self-test prompts.
            </p>
          )}
        </div>
      )}

      {/* FSRS metadata — visible only after reveal */}
      {revealed && (item.stability != null || item.retrievability != null || item.difficulty != null) && (
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          {item.stability != null && (
            <span>
              <strong style={{ fontWeight: 600 }}>S </strong>
              {item.stability.toFixed(1)}d
            </span>
          )}
          {item.retrievability != null && (
            <span>
              <strong style={{ fontWeight: 600 }}>R </strong>
              {(item.retrievability * 100).toFixed(0)}%
            </span>
          )}
          {item.difficulty != null && (
            <span>
              <strong style={{ fontWeight: 600 }}>D </strong>
              {item.difficulty.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {/* Up-next whisper */}
      {nextTitle && (
        <p style={{ fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--hairline)", paddingTop: 12 }}>
          Up next · <span style={{ color: "var(--text)" }}>{nextTitle}</span>
        </p>
      )}
    </article>
  );
}

function Pill({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 3,
        fontSize: 12,
        fontWeight: 500,
        background: muted ? "transparent" : "var(--overlay-hover)",
        color: muted ? "var(--muted)" : "var(--text)",
        border: "1px solid var(--hairline)",
      }}
    >
      {children}
    </span>
  );
}
