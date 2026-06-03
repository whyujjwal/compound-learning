"use client";

import type { ProposalOperation } from "../types";

const LABELS: Record<string, string> = {
  "module.add": "Add module",
  "module.update": "Edit module",
  "module.remove": "Remove module",
  "material.add": "Add material",
  "material.update": "Edit material",
  "material.remove": "Remove material",
  "syllabus.update": "Edit syllabus",
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
    <label className="proposal-op-row">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(operation.id)}
      />
      <div>
        <div className="proposal-op-head">
          <span className="pill">{LABELS[operation.type] ?? operation.type}</span>
          {operation.risk && operation.risk !== "low" && (
            <span className="pill warn">{operation.risk} risk</span>
          )}
        </div>
        <strong>{title}</strong>
        {operation.reason && <p>{operation.reason}</p>}
      </div>
    </label>
  );
}
