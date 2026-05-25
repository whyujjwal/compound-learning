"use client";

import Link from "next/link";

export function AppBar({
  onOpenCmdk,
  onTogglePanel,
  panelOpen,
  onToggleNav,
  navOpen,
}: {
  onOpenCmdk: () => void;
  onTogglePanel: () => void;
  panelOpen: boolean;
  onToggleNav: () => void;
  navOpen: boolean;
}) {
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="appbar">
      <button
        type="button"
        className="appbar-icon-btn appbar-hamburger"
        onClick={onToggleNav}
        aria-label={navOpen ? "Close menu" : "Open menu"}
        aria-expanded={navOpen}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          {navOpen ? (
            <>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>
      <Link href="/" className="appbar-brand" aria-label="Compound home">
        <span className="appbar-brand-dot" aria-hidden />
        Compound
      </Link>
      <div className="appbar-spacer" aria-hidden />
      <div className="appbar-tools">
        <button
          type="button"
          className="cmdk-trigger"
          onClick={onOpenCmdk}
          aria-label="Open command palette"
        >
          <span className="cmdk-trigger-label">Search…</span>
          <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>
        </button>
        <button
          type="button"
          className="appbar-icon-btn appbar-panel-toggle"
          aria-pressed={panelOpen}
          onClick={onTogglePanel}
          aria-label="Toggle context panel"
          title="Toggle context panel"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="0.5" y="0.5" width="13" height="13" rx="2" stroke="currentColor" />
            <path d="M9 0v14" stroke="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}
