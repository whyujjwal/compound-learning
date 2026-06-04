"use client";

/**
 * LogTimeMenu — a small floating panel triggered by a header button.
 * Lets the learner log minutes spent on external resources (e.g. LeetCode,
 * YouTube) for the current material.
 *
 * Uses the raw `api.logSession` — the new useLogSession hook from
 * "@/lib/hooks" is also compatible and preferred when available.
 */

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface LogTimeMenuProps {
  materialId: string;
  materialTitle: string;
}

export function LogTimeMenu({ materialId, materialTitle }: LogTimeMenuProps) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.logSession({
        material_id: materialId,
        duration_minutes: minutes,
        self_rating: confidence,
        notes: notes.trim() || undefined,
        completion_status: "COMPLETED",
      });
      setSaved(true);
      setTimeout(() => setOpen(false), 900);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Log time on external resource"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 9px",
          borderRadius: 4,
          border: "1px solid var(--hairline)",
          background: saved ? "color-mix(in srgb, var(--ok) 10%, transparent)" : "transparent",
          color: saved ? "var(--ok)" : "var(--muted)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 100ms, color 100ms",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          if (!saved) {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
          }
        }}
        onMouseLeave={(e) => {
          if (!saved) {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
          }
        }}
      >
        {saved ? "Logged ✓" : "Log time"}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 500,
            width: 260,
            padding: 16,
            borderRadius: 6,
            border: "1px solid var(--hairline)",
            background: "var(--canvas)",
            boxShadow: "var(--shadow-float)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={materialTitle}
          >
            {materialTitle}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, marginTop: -4 }}>
            Track time spent on external resources for this material.
          </p>

          {/* Minutes */}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Minutes
            </span>
            <input
              type="number"
              min={1}
              max={240}
              value={minutes}
              onChange={(e) => { setSaved(false); setMinutes(Number(e.target.value)); }}
              style={{
                padding: "5px 8px",
                borderRadius: 4,
                border: "1px solid var(--hairline)",
                background: "var(--panel)",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                width: "100%",
              }}
            />
          </label>

          {/* Confidence 1–5 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Confidence
            </span>
            <div role="group" aria-label="Confidence 1 to 5" style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={confidence === n}
                  onClick={() => { setSaved(false); setConfidence(n); }}
                  style={{
                    flex: 1,
                    padding: "4px 0",
                    borderRadius: 4,
                    border: "1px solid var(--hairline)",
                    background: confidence === n ? "var(--accent)" : "transparent",
                    color: confidence === n ? "#fff" : "var(--muted)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 100ms, color 100ms",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Notes (optional)
            </span>
            <textarea
              rows={2}
              placeholder="What did you finish?"
              value={notes}
              onChange={(e) => { setSaved(false); setNotes(e.target.value); }}
              style={{
                padding: "5px 8px",
                borderRadius: 4,
                border: "1px solid var(--hairline)",
                background: "var(--panel)",
                color: "var(--text)",
                fontSize: 13,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
                width: "100%",
              }}
            />
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            style={{
              padding: "7px 14px",
              borderRadius: 4,
              border: "1px solid transparent",
              background: "var(--accent)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              transition: "opacity 100ms",
            }}
          >
            {saved ? "Saved" : saving ? "Saving…" : "Save log"}
          </button>
        </div>
      )}
    </div>
  );
}
