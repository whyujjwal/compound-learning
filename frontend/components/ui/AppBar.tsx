"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const PRIMARY_NAV = [
  { href: "/", label: "Today", match: (p: string) => p === "/" },
  { href: "/coach", label: "Coach", match: (p: string) => p.startsWith("/coach") },
  { href: "/stats", label: "Stats", match: (p: string) => p.startsWith("/stats") },
  { href: "/curriculum", label: "Roadmap", match: (p: string) => p === "/curriculum" || p.startsWith("/curriculum/build") },
];

export function AppBar({
  onOpenCmdk,
  onTogglePanel,
  panelOpen,
  onToggleNav,
  navOpen,
  hasPanel,
}: {
  onOpenCmdk: () => void;
  onTogglePanel: () => void;
  panelOpen: boolean;
  onToggleNav: () => void;
  navOpen: boolean;
  hasPanel: boolean;
}) {
  const pathname = usePathname() || "/";
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    setModKey(/Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl");
  }, []);

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
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          ) : (
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          )}
        </svg>
      </button>

      <Link href="/" className="appbar-brand" aria-label="Compound home">
        <span className="appbar-brand-mark" aria-hidden />
        Compound
      </Link>

      <nav className="appbar-nav" aria-label="Primary">
        {PRIMARY_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`appbar-nav-link${item.match(pathname) ? " active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="appbar-spacer" aria-hidden />

      <div className="appbar-tools">
        <ThemeToggle />
        <button
          type="button"
          className="cmdk-trigger"
          onClick={onOpenCmdk}
          aria-label="Open command palette"
        >
          <span className="cmdk-trigger-label">Search…</span>
          <kbd suppressHydrationWarning>{modKey} K</kbd>
        </button>
        {hasPanel && (
          <button
            type="button"
            className="appbar-icon-btn appbar-panel-toggle"
            aria-pressed={panelOpen}
            onClick={onTogglePanel}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <rect x="0.5" y="0.5" width="13" height="13" rx="2" stroke="currentColor" />
              <path d="M9 0v14" stroke="currentColor" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
