"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppBar({
  onOpenCmdk,
  onToggleNav,
  navOpen,
}: {
  onOpenCmdk: () => void;
  onToggleNav: () => void;
  navOpen: boolean;
}) {
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
        aria-label={navOpen ? "Close sidebar" : "Open sidebar"}
        aria-pressed={navOpen}
      >
        <span aria-hidden>☰</span>
      </button>

      <Link href="/" className="appbar-brand" aria-label="Compound home">
        <span className="appbar-brand-mark" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="appbar-brand-word">compound</span>
      </Link>

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
      </div>
    </header>
  );
}
