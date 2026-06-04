"use client";

import { type ReactNode } from "react";

interface MobileTopBarProps {
  workspaceName: string;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onOpenPalette: () => void;
}

export function MobileTopBar({
  workspaceName,
  drawerOpen,
  onToggleDrawer,
  onOpenPalette,
}: MobileTopBarProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        height: 52,
        padding: "0 12px",
        borderBottom: "1px solid var(--hairline)",
        background: "var(--panel)",
        position: "sticky",
        top: 0,
        zIndex: 60,
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Hamburger */}
      <button
        type="button"
        onClick={onToggleDrawer}
        aria-label="Open navigation menu"
        aria-expanded={drawerOpen}
        aria-controls="mobile-sidebar-drawer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 6,
          color: "var(--muted)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background var(--dur-fast), color var(--dur-fast)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
        }}
      >
        <HamburgerIcon open={drawerOpen} />
      </button>

      {/* Wordmark */}
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text)",
          letterSpacing: "-0.01em",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {workspaceName}
      </span>

      {/* Search / ⌘K trigger */}
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Open search (⌘K)"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 6,
          color: "var(--muted)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background var(--dur-fast), color var(--dur-fast)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
        }}
      >
        <SearchIcon />
      </button>
    </header>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      {open ? (
        /* X icon when open */
        <>
          <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        /* Hamburger lines */
        <>
          <path d="M2.5 5.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2.5 9h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2.5 12.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
