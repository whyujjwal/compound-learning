"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SyllabusEntry } from "./Sidebar";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  syllabi?: SyllabusEntry[];
}

export function CommandPalette({
  open,
  onOpenChange,
  syllabi = [],
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // ⌘K / Ctrl+K toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isQuestion =
        e.key === "?" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement);
      if (isCmdK || isQuestion) {
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

  if (!open) return null;

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
            <Command.Group heading="Navigate">
              <Command.Item value="home today" onSelect={() => go("/")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M7 1.5L1 5.5V12.5H4.5V9H9.5V12.5H13V5.5L7 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  </svg>
                </span>
                Home
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
              </Command.Item>
              <Command.Item value="explore catalog public roadmaps browse" onSelect={() => go("/explore")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M4 10L5.5 7L9 5.5L7.5 8.5L4 10Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  </svg>
                </span>
                Explore
              </Command.Item>
              <Command.Item value="profile account identity progress" onSelect={() => go("/profile")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M2 13C2 10.5 4.2 8.5 7 8.5C9.8 8.5 12 10.5 12 13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                </span>
                Profile
              </Command.Item>
            </Command.Group>

            {/* ── Create ──────────────────────────────── */}
            <Command.Group heading="Create">
              <Command.Item value="new syllabus create library" onSelect={() => go("/library/new")}>
                <span className="cmdk-item-icon" style={{ color: "var(--accent)" }}>+</span>
                New syllabus
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

            {/* ── Settings ────────────────────────────── */}
            <Command.Group heading="Other">
              <Command.Item value="settings profile preferences" onSelect={() => go("/profile")}>
                <span className="cmdk-item-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M7 1V2.5M7 11.5V13M1 7H2.5M11.5 7H13M2.929 2.929L3.99 3.99M10.01 10.01L11.07 11.07M11.07 2.929L10.01 3.99M3.99 10.01L2.929 11.07" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                </span>
                Settings
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </>
  );
}
