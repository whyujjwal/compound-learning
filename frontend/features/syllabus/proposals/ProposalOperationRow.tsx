"use client";

import { Badge } from "@/components/primitives";
import type { ProposalOperation } from "../types";

const LABELS: Record<string, string> = {
  "module.add": "Add module",
  "module.update": "Edit module",
  "module.remove": "Remove module",
  "material.add": "Add material",
  "material.update": "Edit material",
  "material.remove": "Remove material",
  "syllabus.update": "Edit syllabus",
  "section.add": "Add section",
  "section.remove": "Remove section",
};

const riskColor: Record<string, React.ComponentProps<typeof Badge>["color"]> = {
  low: "muted",
  medium: "warn",
  high: "error",
};

export function ProposalOperationRow({
  operation,
  selected,
  onToggle,
}: {
  operation: ProposalOperation;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const title =
    (operation.payload.title as string | undefined) ||
    (operation.before?.title as string | undefined) ||
    operation.type;

  return (
    <label
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 4,
        cursor: "pointer",
        background: selected ? "var(--accent-soft)" : "transparent",
        border: `1px solid ${selected ? "var(--accent)" : "var(--hairline)"}`,
        transition: "background var(--dur-fast), border-color var(--dur-fast)",
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(operation.id)}
        style={{ flexShrink: 0, marginTop: 2, accentColor: "var(--accent)" }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Op type + risk */}
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <Badge color="default">{LABELS[operation.type] ?? operation.type}</Badge>
          {operation.risk && operation.risk !== "low" && (
            <Badge color={riskColor[operation.risk] ?? "warn"}>
              {operation.risk} risk
            </Badge>
          )}
        </div>

        {/* Title */}
        <strong style={{ fontSize: 13, color: "var(--text)", display: "block", marginBottom: 2 }}>
          {title}
        </strong>

        {/* Reason */}
        {operation.reason && (
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            {operation.reason}
          </p>
        )}
      </div>
    </label>
  );
}
