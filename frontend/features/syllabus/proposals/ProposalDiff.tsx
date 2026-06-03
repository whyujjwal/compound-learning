"use client";

import { useMemo, useState } from "react";
import type { SyllabusProposal } from "../types";
import { ProposalOperationRow } from "./ProposalOperationRow";

export function ProposalDiff({
  proposal,
  onApply,
  onReject,
  applying,
}: {
  proposal: SyllabusProposal;
  onApply: (operationIds: string[]) => void;
  onReject: () => void;
  applying?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(proposal.operations.map((op) => op.id))
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof proposal.operations>();
    for (const op of proposal.operations) {
      const key = op.type.split(".")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(op);
    }
    return map;
  }, [proposal.operations]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedIds = [...selected];

  return (
    <section className="proposal-diff">
      <header className="proposal-diff-head">
        <div>
          <p className="page-kicker">Proposal</p>
          <h3>{proposal.summary || "Review proposed changes"}</h3>
          <p style={{ color: "var(--fg-mute)", fontSize: 12.5 }}>
            Status: {proposal.status} · Base version {proposal.base_version}
          </p>
        </div>
        <div className="proposal-diff-actions">
          <button
            type="button"
            className="v2-btn ghost"
            onClick={onReject}
            disabled={applying}
          >
            Reject
          </button>
          <button
            type="button"
            className="v2-btn primary"
            disabled={applying || selectedIds.length === 0}
            onClick={() => onApply(selectedIds)}
          >
            {applying ? "Applying..." : `Apply selected (${selectedIds.length})`}
          </button>
        </div>
      </header>

      {proposal.status === "CONFLICTED" && (
        <p className="week-canvas-message">
          This proposal conflicts with newer syllabus changes. Retry with force from Studio or create a
          fresh proposal.
        </p>
      )}

      {[...grouped.entries()].map(([group, operations]) => (
        <div key={group} className="proposal-op-group">
          <h4>{group}</h4>
          {operations.map((op) => (
            <ProposalOperationRow
              key={op.id}
              operation={op}
              selected={selected.has(op.id)}
              onToggle={toggle}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
