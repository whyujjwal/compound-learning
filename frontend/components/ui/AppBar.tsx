"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const PRIMARY_NAV = [
  { href: "/", label: "Today", match: (p: string) => p === "/" },
  {
    href: "/curriculum",
    label: "Learn",
    match: (p: string) =>
      p.startsWith("/curriculum") || p.startsWith("/track/") || p.startsWith("/materials") || p.startsWith("/cards"),
  },
  { href: "/explore", label: "Explore", match: (p: string) => p.startsWith("/explore") },
  { href: "/schedule", label: "Week", match: (p: string) => p.startsWith("/schedule") },
  { href: "/coach", label: "Coach", match: (p: string) => p.startsWith("/coach") },
];

export function AppBar({
  onOpenCmdk,
}: {
  onOpenCmdk: () => void;
}) {
  const pathname = usePathname() || "/";
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    setModKey(/Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl");
  }, []);

  return (
    <header className="appbar">
      <Link href="/" className="appbar-brand" aria-label="Compound home">
        <span className="appbar-brand-mark" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="appbar-brand-word">compound</span>
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
      </div>
    </header>
  );
}
