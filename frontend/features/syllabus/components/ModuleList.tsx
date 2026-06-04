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
    return (
      <p style={{ fontSize: 14, color: "var(--muted)", padding: "24px 0" }}>
        No modules yet. Add one in Syllabus Studio.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {modules.map((module) => {
        const isOpen = expanded.has(module.id);
        const pct = module.material_count
          ? Math.round((module.mastered_count / module.material_count) * 100)
          : 0;

        return (
          <div
            key={module.id}
            style={{ borderBottom: "1px solid var(--hairline)" }}
          >
            {/* Module toggle row */}
            <button
              type="button"
              onClick={() => onToggle(module.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 0",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
            >
              {/* Caret */}
              <span
                aria-hidden
                style={{
                  width: 18,
                  flexShrink: 0,
                  color: "var(--muted)",
                  fontSize: 11,
                  transition: "transform var(--dur-fast)",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ▶
              </span>

              {/* Title */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  {module.title}
                </span>
                {module.objective && (
                  <span style={{ marginLeft: 10, fontSize: 13, color: "var(--muted)" }}>
                    {module.objective}
                  </span>
                )}
              </div>

              {/* Meta */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {module.material_count} items
                </span>
                <span style={{ fontSize: 12, color: pct === 100 ? "var(--ok)" : "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                  {pct}%
                </span>
              </div>
            </button>

            {/* Materials list (expanded) */}
            {isOpen && (
              <div style={{ paddingLeft: 26, paddingBottom: 8 }}>
                {module.materials.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>
                    No materials in this module.
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
                    {module.materials.map((material) => (
                      <li
                        key={material.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "7px 0",
                          borderBottom: "1px solid var(--hairline)",
                          fontSize: 14,
                          color: "var(--text)",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: material.card_state === "mastered"
                              ? "var(--ok)"
                              : material.card_state
                                ? "var(--accent)"
                                : "var(--hairline)",
                          }}
                        />
                        <span style={{ flex: 1 }}>{material.title}</span>
                        {material.estimated_minutes > 0 && (
                          <span style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                            {material.estimated_minutes}m
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
