import type { CourseMaterial } from "../types";

const TYPE_ICON: Record<string, string> = {
  video: "▶", article: "📄", docs: "📘", paper: "📑", course: "🎓",
  interactive: "🕹", book: "📖", repo: "🐙", practice: "🧪", project: "🏗", quiz: "❓",
};

export function ResourceChip({ material }: { material: CourseMaterial }) {
  const type = material.resource_type ?? "article";
  const icon = TYPE_ICON[type] ?? "🔗";
  const status = material.mastered ? "mastered" : material.started ? "started" : "new";
  const body = (
    <span className={`course-chip status-${status}`}>
      <span className="course-chip-icon" aria-label={type} role="img">{icon}</span>
      <span className="course-chip-title">{material.title}</span>
      <span className="course-chip-meta">
        {material.provider ? `${material.provider} · ` : ""}{material.estimated_minutes}m
        {material.difficulty ? ` · ${material.difficulty}` : ""}
        {material.resource_health_status === "BROKEN" ? " · ⚠ link" : ""}
      </span>
    </span>
  );
  if (material.external_url) {
    return (
      <a className="course-chip-link" href={material.external_url} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  }
  return body;
}
