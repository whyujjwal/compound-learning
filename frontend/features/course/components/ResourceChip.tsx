import { Badge } from "@/components/primitives";
import type { CourseMaterial } from "../types";

// Text-only icons — no emoji to keep Notion aesthetic
const TYPE_LABEL: Record<string, string> = {
  video: "Video",
  article: "Article",
  docs: "Docs",
  paper: "Paper",
  course: "Course",
  interactive: "Interactive",
  book: "Book",
  repo: "Repo",
  practice: "Practice",
  project: "Project",
  quiz: "Quiz",
};

function statusDot(material: CourseMaterial): React.CSSProperties["background"] {
  if (material.mastered) return "var(--ok)";
  if (material.started) return "var(--accent)";
  return "var(--hairline)";
}

export function ResourceChip({ material }: { material: CourseMaterial }) {
  const type = material.resource_type ?? "article";
  const typeLabel = TYPE_LABEL[type] ?? type;
  const broken = material.resource_health_status === "BROKEN";

  const inner = (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        transition: "background var(--dur-fast)",
      }}
    >
      {/* Status dot */}
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          flexShrink: 0,
          background: statusDot(material),
        }}
      />

      {/* Title */}
      <span style={{
        flex: 1,
        fontSize: 14,
        color: "var(--text)",
        lineHeight: 1.4,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {material.title}
        {broken && (
          <span style={{ marginLeft: 6, fontSize: 11, color: "var(--bad)" }}>broken link</span>
        )}
      </span>

      {/* Meta */}
      <span style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        <Badge color="muted">{typeLabel}</Badge>
        {material.estimated_minutes > 0 && (
          <span style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            {material.estimated_minutes}m
          </span>
        )}
        {material.difficulty && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{material.difficulty}</span>
        )}
      </span>
    </span>
  );

  if (material.external_url) {
    return (
      <a
        href={material.external_url}
        target="_blank"
        rel="noreferrer"
        style={{ display: "block", color: "inherit", textDecoration: "none" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "inherit")}
      >
        {inner}
      </a>
    );
  }

  return inner;
}
