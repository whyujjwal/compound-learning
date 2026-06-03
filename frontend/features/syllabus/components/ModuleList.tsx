"use client";

import type { SyllabusModule } from "../types";

export function ModuleList({
  modules,
  expanded,
  onToggle,
}: {
  modules: SyllabusModule[];
  expanded: Set<string>;
  onToggle: (moduleId: string) => void;
}) {
  if (modules.length === 0) {
    return <p style={{ color: "var(--fg-mute)", fontSize: 13 }}>No modules yet. Add one in Syllabus Studio.</p>;
  }

  return (
    <div className="module-list">
      {modules.map((module) => {
        const isOpen = expanded.has(module.id);
        return (
          <section key={module.id} className="module-card">
            <button type="button" className="module-card-head" onClick={() => onToggle(module.id)}>
              <div>
                <h3>{module.title}</h3>
                <p>{module.objective}</p>
              </div>
              <span className="pill muted">
                {module.material_count} materials · {module.started_count} started
              </span>
            </button>
            {isOpen && (
              <ul className="module-material-list">
                {module.materials.map((material) => (
                  <li key={material.id}>
                    <span>{material.title}</span>
                    <span className="pill muted">{material.estimated_minutes}m</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
