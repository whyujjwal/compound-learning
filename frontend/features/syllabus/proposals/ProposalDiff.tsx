"use client";

import { useMemo, useState } from "react";
import { Badge, Button } from "@/components/primitives";
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

  function toggleAll() {
    if (selected.size === proposal.operations.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(proposal.operations.map((op) => op.id)));
    }
  }

  const selectedIds = [...selected];
  const allSelected = selected.size === proposal.operations.length;

  return (
    <div style={{
      border: "1px solid var(--hairline)",
      borderRadius: 6,
      overflow: "hidden",
      marginTop: 16,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 16px",
        borderBottom: "1px solid var(--hairline)",
        background: "var(--panel)",
      }}>
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>
              Proposal
            </p>
            <Badge color={proposal.status === "CONFLICTED" ? "error" : "success"}>
              {proposal.status}
            </Badge>
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
            {proposal.summary || "Review proposed changes"}
          </h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            Base version {proposal.base_version} · {proposal.operations.length} operations
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <Button variant="ghost" size="sm" onClick={onReject} disabled={applying}>
            Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={applying || selectedIds.length === 0}
            loading={applying}
            onClick={() => onApply(selectedIds)}
          >
            Apply ({selectedIds.length})
          </Button>
        </div>
      </div>

      {/* Conflict warning */}
      {proposal.status === "CONFLICTED" && (
        <div style={{
          padding: "10px 16px",
          background: "rgba(235, 87, 87, 0.06)",
          borderBottom: "1px solid var(--hairline)",
          fontSize: 13,
          color: "var(--bad)",
        }}>
          This proposal conflicts with newer syllabus changes. Create a fresh proposal.
        </div>
      )}

      {/* Select all */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        borderBottom: "1px solid var(--hairline)",
      }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 13, color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            style={{ accentColor: "var(--accent)" }}
          />
          {allSelected ? "Deselect all" : "Select all"}
        </label>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {selected.size} / {proposal.operations.length} selected
        </span>
      </div>

      {/* Operations grouped */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {[...grouped.entries()].map(([group, operations]) => (
          <div key={group}>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 8,
            }}>
              {group}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {operations.map((op) => (
                <ProposalOperationRow
                  key={op.id}
                  operation={op}
                  selected={selected.has(op.id)}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
