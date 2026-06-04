"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ─── Nav items ──────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    match: (p: string) => p === "/",
    icon: HomeIcon,
  },
  {
    href: "/library",
    label: "Library",
    match: (p: string) => p.startsWith("/library") || p.startsWith("/track/"),
    icon: LibraryIcon,
  },
  {
    href: "/explore",
    label: "Explore",
    match: (p: string) => p.startsWith("/explore"),
    icon: ExploreIcon,
  },
  {
    href: "/profile",
    label: "Profile",
    match: (p: string) =>
      p.startsWith("/profile") ||
      p.startsWith("/settings") ||
      p.startsWith("/progress") ||
      p.startsWith("/stats"),
    icon: ProfileIcon,
  },
] as const;

/* ─── Syllabus entry shape ───────────────────────────────── */
export interface SyllabusEntry {
  id: string | number;
  slug: string;
  name: string;
  color?: string;
  progress?: number; // 0–1
}

/* ─── Sidebar props ──────────────────────────────────────── */
interface SidebarProps {
  syllabi?: SyllabusEntry[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Click handler for the ⌘K command palette */
  onOpenPalette?: () => void;
  /** Workspace / app title shown at the top */
  workspaceName?: string;
}

/* ─── Main component ─────────────────────────────────────── */
export function Sidebar({
  syllabi = [],
  collapsed = false,
  onToggleCollapse,
  onOpenPalette,
  workspaceName = "Compound",
}: SidebarProps) {
  const pathname = usePathname() ?? "/";

  return (
    <aside
      aria-label="Sidebar navigation"
      style={{
        width: collapsed ? 0 : "var(--sidebar-w)",
        flexShrink: 0,
        borderRight: collapsed ? "none" : "1px solid var(--hairline)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width 150ms ease, opacity 150ms ease, border-color 150ms ease",
        opacity: collapsed ? 0 : 1,
      }}
    >
      {/* ── Workspace header ─────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px 8px",
          gap: 6,
        }}
      >
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            padding: "4px 6px",
            borderRadius: 4,
            fontWeight: 500,
            fontSize: 14,
            color: "var(--text)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            transition: "background var(--dur-fast)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          aria-label={`${workspaceName} workspace menu`}
        >
          <WorkspaceIcon />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {workspaceName}
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ThemeToggle />
          {onToggleCollapse && (
            <SidebarIconButton onClick={onToggleCollapse} aria-label="Collapse sidebar">
              <CollapseIcon />
            </SidebarIconButton>
          )}
        </div>
      </div>

      {/* ── Search / palette trigger ──────────────── */}
      {onOpenPalette && (
        <div style={{ padding: "0 8px 4px" }}>
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open command palette (⌘K)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "5px 8px",
              borderRadius: 4,
              fontSize: 14,
              color: "var(--muted)",
              background: "var(--overlay-hover)",
              border: "1px solid transparent",
              cursor: "text",
              textAlign: "left",
              transition: "border-color var(--dur-fast)",
            }}
            onFocus={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
          >
            <SearchIcon />
            <span style={{ flex: 1 }}>Search…</span>
            <kbd style={{
              fontSize: 11,
              padding: "1px 4px",
              borderRadius: 3,
              border: "1px solid var(--hairline)",
              background: "var(--canvas)",
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
            }}>
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ── Primary nav ──────────────────────────── */}
      <nav aria-label="Primary">
        <SidebarSection>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                active={active}
                icon={<Icon />}
              >
                {item.label}
              </SidebarNavLink>
            );
          })}
        </SidebarSection>
      </nav>

      {/* ── Syllabi list ──────────────────────────── */}
      <nav aria-label="Syllabi">
        <SidebarSection label="Syllabi">
          {syllabi.length === 0 ? (
            <p style={{
              padding: "6px 12px",
              fontSize: 13,
              color: "var(--muted)",
              lineHeight: 1.5,
            }}>
              No syllabi yet.
            </p>
          ) : (
            syllabi.map((s) => {
              const active =
                pathname === `/library/${s.slug}` || pathname === `/track/${s.slug}`;
              return (
                <SidebarSyllabusLink
                  key={s.id}
                  href={`/library/${s.slug}`}
                  active={active}
                  name={s.name}
                  color={s.color}
                  progress={s.progress}
                />
              );
            })
          )}
        </SidebarSection>
      </nav>

      {/* ── Spacer ───────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Profile / footer area ─────────────────── */}
      <div style={{
        padding: "8px",
        borderTop: "1px solid var(--hairline)",
      }}>
        <SidebarNavLink href="/profile" active={pathname.startsWith("/profile")} icon={<ProfileIcon />}>
          Profile
        </SidebarNavLink>
      </div>
    </aside>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function SidebarSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div style={{ padding: "4px 0" }}>
      {label && (
        <div style={{
          padding: "8px 14px 3px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function SidebarNavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "1px 6px",
        padding: "5px 8px",
        borderRadius: 4,
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        color: active ? "var(--text)" : "var(--muted)",
        background: active ? "var(--overlay-hover)" : "transparent",
        transition: "background var(--dur-fast), color var(--dur-fast)",
        textDecoration: "none",
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "var(--overlay-hover)";
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
        (e.currentTarget as HTMLAnchorElement).style.color = active ? "var(--text)" : "var(--muted)";
      }}
    >
      <span style={{
        width: 18,
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        opacity: active ? 1 : 0.7,
        color: active ? "var(--accent)" : "inherit",
      }}>
        {icon}
      </span>
      {children}
    </Link>
  );
}

function SidebarSyllabusLink({
  href,
  active,
  name,
  color,
  progress,
}: {
  href: string;
  active: boolean;
  name: string;
  color?: string;
  progress?: number;
}) {
  const dotColor = color ?? "var(--accent)";
  return (
    <Link
      href={href}
      title={name}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "1px 6px",
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 13,
        color: active ? "var(--text)" : "var(--muted)",
        background: active ? "var(--overlay-hover)" : "transparent",
        transition: "background var(--dur-fast), color var(--dur-fast)",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "var(--overlay-hover)";
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
        (e.currentTarget as HTMLAnchorElement).style.color = active ? "var(--text)" : "var(--muted)";
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span style={{
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {name}
      </span>
      {progress !== undefined && (
        <span style={{
          fontSize: 11,
          color: "var(--muted)",
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}>
          {Math.round(progress * 100)}%
        </span>
      )}
    </Link>
  );
}

function SidebarIconButton({
  onClick,
  "aria-label": ariaLabel,
  children,
}: {
  onClick: () => void;
  "aria-label": string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 4,
        color: "var(--muted)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
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
      {children}
    </button>
  );
}

/* ─── Inline SVG icons (small, 16px) ────────────────────── */
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5L1.5 6.5V14.5H5.5V10.5H10.5V14.5H14.5V6.5L8 1.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2.5" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.25"/>
      <rect x="6.5" y="2.5" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M11.5 3L14.5 4V13.5L11.5 12.5V3Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M5 11L7 7.5L10.5 6L8.5 9.5L5 11Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M2.5 14C2.5 11.5147 4.98 9.5 8 9.5C11.02 9.5 13.5 11.5147 13.5 14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M8 2L3 7L8 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
