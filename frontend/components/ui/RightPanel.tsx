"use client";

import { ReactNode } from "react";

export function RightPanel({ children }: { children: ReactNode }) {
  return <aside className="panel">{children}</aside>;
}

export function PanelSection({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel-section">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="panel-label">{label}</span>
        {action}
      </div>
      {children}
    </section>
  );
}
