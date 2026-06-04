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
    <div style={{ paddingTop: 24 }}>
      {/* Studio header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: "1px solid var(--hairline)",
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
            Syllabus Studio
          </p>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
            {syllabus.name}
          </h2>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 360, textAlign: "right" }}>
          Edit modules, materials, and review AI proposals before applying changes.
        </p>
      </div>
      {children}
    </div>
  );
}
