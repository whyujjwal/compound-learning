"use client";

import { useState } from "react";
import type { CourseModule, CourseTree } from "../types";
import { KindBadge } from "./KindBadge";
import { OutcomeList } from "./OutcomeList";
import { ProgressRing } from "./ProgressRing";
import { ResourceChip } from "./ResourceChip";

function ModuleBlock({ module }: { module: CourseModule }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="course-outline-module">
      <button type="button" className="course-outline-module-head" onClick={() => setOpen((v) => !v)}>
        <span className="course-outline-caret" aria-hidden>{open ? "▾" : "▸"}</span>
        <span className="course-outline-module-title">
          <strong>{module.title}</strong>
          <KindBadge kind={module.kind} label={module.label} />
        </span>
        <span className="course-outline-module-meta">
          {module.material_count} materials · {Math.round(module.estimated_minutes / 60) || 1}h
        </span>
        <ProgressRing value={module.mastered_count} total={module.material_count} />
      </button>
      {open && (
        <div className="course-outline-module-body">
          <OutcomeList outcomes={module.learning_outcomes} heading="By the end of this module" />
          {module.sections.map((section) => (
            <div key={section.id} className="course-outline-section">
              <div className="course-outline-section-head">
                <span className="course-outline-section-title">{section.title}</span>
                <KindBadge kind={section.kind} label={section.label} />
                <span className="course-outline-section-meta">{section.material_count} items</span>
              </div>
              <OutcomeList outcomes={section.learning_outcomes} />
              <ul className="course-outline-materials">
                {section.materials.map((mat) => (
                  <li key={mat.id}><ResourceChip material={mat} /></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function OutlineTree({ tree }: { tree: CourseTree }) {
  if (!tree.modules.length) {
    return <p className="course-outline-empty">No modules yet. Generate or add some in Studio.</p>;
  }
  return (
    <div className="course-outline">
      <OutcomeList outcomes={tree.outcomes} heading="Course outcomes" />
      {tree.modules.map((module) => (
        <ModuleBlock key={module.id} module={module} />
      ))}
    </div>
  );
}
