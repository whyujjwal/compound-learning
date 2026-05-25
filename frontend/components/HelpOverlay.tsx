"use client";

import { useEffect, useState } from "react";

const SHORTCUTS: { keys: string; label: string; scope: string }[] = [
  { keys: "?", label: "Open this help", scope: "Global" },
  { keys: "Esc", label: "Close overlays", scope: "Global" },
  { keys: "g t", label: "Go to Today", scope: "Navigation" },
  { keys: "g r", label: "Go to Roadmap", scope: "Navigation" },
  { keys: "g c", label: "Go to Coach", scope: "Navigation" },
  { keys: "g s", label: "Go to Stats", scope: "Navigation" },
  { keys: "Space", label: "Reveal answer", scope: "Review" },
  { keys: "1", label: "Rate Again", scope: "Review" },
  { keys: "2", label: "Rate Hard", scope: "Review" },
  { keys: "3", label: "Rate Good", scope: "Review" },
  { keys: "4", label: "Rate Easy", scope: "Review" },
  { keys: "F", label: "Toggle focus mode", scope: "Today" },
];

export function HelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let pending = "";
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    function onKey(e: KeyboardEvent) {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (e.key === "g") {
        pending = "g";
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => {
          pending = "";
        }, 800);
        return;
      }
      if (pending === "g") {
        pending = "";
        if (pendingTimer) clearTimeout(pendingTimer);
        const map: Record<string, string> = {
          t: "/",
          r: "/curriculum",
          c: "/coach",
          s: "/stats",
          m: "/materials",
        };
        const dest = map[e.key];
        if (dest) {
          e.preventDefault();
          window.location.href = dest;
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (pendingTimer) clearTimeout(pendingTimer);
    };
  }, [open]);

  if (!open) return null;

  const groups = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((acc, s) => {
    (acc[s.scope] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="help-backdrop" onClick={() => setOpen(false)}>
      <div className="help-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <div className="eyebrow">Keyboard shortcuts</div>
          <h2>Move faster</h2>
          <button className="ghost" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <div className="help-groups">
          {Object.entries(groups).map(([scope, items]) => (
            <div key={scope} className="help-group">
              <h3>{scope}</h3>
              {items.map((s) => (
                <div key={s.keys + s.label} className="help-row">
                  <span className="help-keys">
                    {s.keys.split(" ").map((k, i) => (
                      <kbd key={i}>{k}</kbd>
                    ))}
                  </span>
                  <span className="help-label">{s.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
