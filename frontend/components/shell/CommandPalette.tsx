"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import type { SyllabusEntry } from "./Sidebar";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  syllabi?: SyllabusEntry[];
}

/* ─── Kbd hint (right-aligned in item) ───────────────────── */
function KbdHint({ keys }: { keys: string[] }) {
  return (
    <span
      aria-hidden
      style={{
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      {keys.map((k, i) => (
        <kbd
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1px 4px",
            minWidth: 18,
            height: 18,
            borderRadius: 3,
            fontSize: 10,
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            fontWeight: 500,
            lineHeight: 1,
            color: "var(--muted)",
            background: "var(--overlay-hover)",
            border: "1px solid var(--hairline)",
          }}
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export function CommandPalette({
  open,
  onOpenChange,
  syllabi = [],
}: CommandPaletteProps) {
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");

  // ⌘K / Ctrl+K toggle — palette is authoritative for this binding
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function go(href: string) {
    router.push(href);
    onOpenChange(false);
    setQuery("");
  }

  function run(action: () => void) {
    action();
    onOpenChange(false);
    setQuery("");
  }

  if (!open) return null;

  const themeLabel =
    resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <>
      {/* Backdrop */}
      <div
        className="cmdk-overlay"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      {/* Palette */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "15vh",
          pointerEvents: "none",
        }}
      >
        <Command
          label="Command palette"
          className="cmdk-root"
          shouldFilter
          style={{ pointerEvents: "auto" }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            borderBottom: "1px solid var(--hairline)",
            gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ color: "var(--muted)", flexShrink: 0 }}>
              <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
            <Command.Input
              placeholder="Jump to a page, syllabus, or run a command…"
              value={query}
              onValueChange={setQuery}
              autoFocus
            />
          </div>

          <Command.List>
            <Command.Empty>Nothing matched &ldquo;{query}&rdquo;</Command.Empty>

            {/* ── Navigation ─────────────────────────── */}
            <Command.Group heading="Navigation">
              <Command.Item value="home today dashboard" onSelect={() => go("/")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M7 1.5L1 5.5V12.5H4.5V9H9.5V12.5H13V5.5L7 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  </svg>
                </span>
                Home
                <KbdHint keys={["G", "H"]} />
              </Command.Item>
              <Command.Item value="library syllabi my library" onSelect={() => go("/library")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <rect x="1" y="2" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                    <rect x="6" y="2" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M10.5 2.5L13 3.5V11.5L10.5 10.5V2.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  </svg>
                </span>
                Library
                <KbdHint keys={["G", "L"]} />
              </Command.Item>
              <Command.Item value="explore catalog public roadmaps browse" onSelect={() => go("/explore")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M4 10L5.5 7L9 5.5L7.5 8.5L4 10Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  </svg>
                </span>
                Explore
                <KbdHint keys={["G", "E"]} />
              </Command.Item>
              <Command.Item value="plan weekly schedule calendar study week" onSelect={() => go("/plan")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M1 5.5h12" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M4.5 1v2M9.5 1v2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    <path d="M3.5 8h3M3.5 10h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                </span>
                Plan
              </Command.Item>
              <Command.Item value="profile account identity progress" onSelect={() => go("/profile")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M2 13C2 10.5 4.2 8.5 7 8.5C9.8 8.5 12 10.5 12 13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                </span>
                Profile
                <KbdHint keys={["G", "P"]} />
              </Command.Item>
            </Command.Group>

            {/* ── Actions ─────────────────────────────── */}
            <Command.Group heading="Actions">
              <Command.Item value="new syllabus create library add" onSelect={() => go("/library/new")}>
                <span className="cmdk-item-icon" style={{ color: "var(--accent)" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                  </svg>
                </span>
                New syllabus
              </Command.Item>
              <Command.Item value="start session review study today cards" onSelect={() => go("/")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M3 2.5L11 7L3 11.5V2.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  </svg>
                </span>
                Start today&apos;s session
              </Command.Item>
              <Command.Item value="toggle theme dark light mode appearance" onSelect={() => run(toggleTheme)}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M7 1V2.5M7 11.5V13M1 7H2.5M11.5 7H13M2.929 2.929L3.99 3.99M10.01 10.01L11.07 11.07M11.07 2.929L10.01 3.99M3.99 10.01L2.929 11.07" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                </span>
                {themeLabel}
              </Command.Item>
              <Command.Item
                value="keyboard shortcuts help hotkeys bindings"
                onSelect={() => {
                  onOpenChange(false);
                  setQuery("");
                  // Brief delay so the palette overlay unmounts before the dialog mounts
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("compound:open-shortcuts"));
                  }, 80);
                }}
              >
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M3.5 6H4.5M6.5 6H7.5M9.5 6H10.5M3.5 8.5H10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                </span>
                Show keyboard shortcuts
                <KbdHint keys={["?"]} />
              </Command.Item>
            </Command.Group>

            {/* ── Syllabi ─────────────────────────────── */}
            {syllabi.length > 0 && (
              <Command.Group heading="Syllabi">
                {syllabi.map((s) => (
                  <Command.Item
                    key={s.id}
                    value={`syllabus ${s.name} ${s.slug}`}
                    onSelect={() => go(`/library/${s.slug}`)}
                  >
                    <span
                      className="cmdk-item-icon"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: s.color ?? "var(--muted)",
                        display: "inline-block",
                        margin: "0 auto",
                      }}
                    />
                    {s.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </>
  );
}
