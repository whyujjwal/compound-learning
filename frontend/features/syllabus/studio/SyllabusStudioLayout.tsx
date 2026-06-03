"use client";

import { ReactNode } from "react";
import type { SyllabusDetail } from "../types";

export function SyllabusStudioLayout({
  syllabus,
  children,
}: {
  syllabus: SyllabusDetail;
  children: ReactNode;
}) {
  return (
    <div className="syllabus-studio">
      <div className="syllabus-studio-bar">
        <div>
          <p className="page-kicker">Syllabus Studio</p>
          <h2>{syllabus.name}</h2>
        </div>
        <p style={{ color: "var(--fg-mute)", fontSize: 12.5 }}>
          Edit modules, materials, and review AI proposals before applying changes.
        </p>
      </div>
      {children}
    </div>
  );
}
