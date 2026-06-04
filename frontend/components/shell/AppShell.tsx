"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Sidebar, type SyllabusEntry } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { CommandPalette } from "./CommandPalette";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

/* ─── Shell context ──────────────────────────────────────── */
export type ShellContextValue = {
  /** Open the ⌘K command palette */
  openPalette: () => void;
  /** Open the keyboard shortcuts help dialog */
  openShortcuts: () => void;
  /** Register a right-panel node (pass null to clear) */
  setRightPanel: (node: ReactNode | null) => void;
  /** Whether the sidebar is collapsed */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** Syllabi list (populated by data layer / page) */
  syllabi: SyllabusEntry[];
  setSyllabi: (entries: SyllabusEntry[]) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useAppShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useAppShell must be used inside <AppShell>");
  return ctx;
}

/* ─── Shell component ────────────────────────────────────── */
interface AppShellProps {
  children: ReactNode;
  /** Workspace name shown in the sidebar header */
  workspaceName?: string;
}

export function AppShell({ children, workspaceName = "Compound" }: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [rightPanel, setRightPanelState] = useState<ReactNode | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [syllabi, setSyllabiState] = useState<SyllabusEntry[]>([]);
  /** Mobile-only: controls the slide-over drawer */
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);
  const setRightPanel = useCallback((node: ReactNode | null) => setRightPanelState(node), []);
  const setSyllabi = useCallback((entries: SyllabusEntry[]) => setSyllabiState(entries), []);

  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);
  const toggleMobileDrawer = useCallback(() => setMobileDrawerOpen((v) => !v), []);

  /* Lock body scroll while mobile drawer is open */
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileDrawerOpen]);

  /* Close mobile drawer on route change */
  const pathname = usePathname();
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const ctx: ShellContextValue = useMemo(
    () => ({ openPalette, openShortcuts, setRightPanel, sidebarCollapsed, toggleSidebar, syllabi, setSyllabi }),
    [openPalette, openShortcuts, setRightPanel, sidebarCollapsed, toggleSidebar, syllabi, setSyllabi]
  );

  return (
    <ShellContext.Provider value={ctx}>
      {/*
       * ── Responsive layout ──────────────────────────────────
       *
       * Desktop (>768px): flex row — [Sidebar | main | right-panel]
       *   • Sidebar is sticky, collapsible via its own toggle button.
       *   • Right panel sits beside main content.
       *
       * Mobile (≤768px): flex column — [MobileTopBar / main / (right panel below)]
       *   • MobileTopBar (52px) is always visible.
       *   • Sidebar becomes a slide-over drawer controlled by the hamburger.
       *   • Right panel collapses below main content (full width).
       *
       * The CSS classes below use a <style> tag with a media query so we
       * avoid adding Tailwind breakpoints to design-system.css (which is off-limits).
       */}
      <style>{`
        /* ── Mobile drawer styles ─────────────────────────────── */
        @media (max-width: 768px) {
          /* Hide the desktop sidebar from layout flow on mobile */
          .sidebar-desktop {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            height: 100dvh !important;
            z-index: 100 !important;
            width: 260px !important;
            opacity: 1 !important;
            border-right: 1px solid var(--hairline) !important;
            transform: translateX(-100%);
            transition: transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1) !important;
            /* Override the desktop collapsed logic — always show on mobile when open */
          }
          .sidebar-desktop.sidebar-mobile--open {
            transform: translateX(0);
          }
          .sidebar-desktop.sidebar-mobile--closed {
            transform: translateX(-100%);
          }
          /* Show the scrim on mobile */
          .mobile-scrim {
            display: block !important;
          }
          /* Show the mobile top bar */
          .mobile-topbar {
            display: flex !important;
          }
          /* Hide the desktop re-expand button on mobile */
          .desktop-expand-btn {
            display: none !important;
          }
          /* The main horizontal strip stacks vertically on mobile */
          .shell-main-strip {
            flex-direction: column !important;
          }
          /* Right panel: full width, stacked below content on mobile */
          .shell-right-panel-mobile {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid var(--hairline) !important;
            flex-shrink: unset !important;
          }
        }
        @media (min-width: 769px) {
          /* Desktop: hide the mobile top bar */
          .mobile-topbar {
            display: none !important;
          }
          /* Desktop: sidebar is in normal flow (sticky), not fixed */
          .sidebar-desktop {
            position: sticky !important;
            transform: none !important;
          }
          /* Desktop: scrim never visible */
          .mobile-scrim {
            display: none !important;
          }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        {/* ── Mobile top bar ─────────────────────────────── */}
        <div className="mobile-topbar" style={{ display: "none" }}>
          <MobileTopBar
            workspaceName={workspaceName}
            drawerOpen={mobileDrawerOpen}
            onToggleDrawer={toggleMobileDrawer}
            onOpenPalette={openPalette}
          />
        </div>

        {/* ── Main horizontal strip (sidebar + content + right panel) */}
        <div className="shell-main-strip" style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* ── Left sidebar ─────────────────────────────── */}
          <Sidebar
            syllabi={syllabi}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            onOpenPalette={openPalette}
            workspaceName={workspaceName}
            mobileDrawerOpen={mobileDrawerOpen}
            onMobileDrawerClose={closeMobileDrawer}
          />

          {/* ── Content area ─────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            {/* Desktop re-expand button (shown only when sidebar is collapsed on desktop) */}
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
                className="desktop-expand-btn"
                style={{
                  position: "fixed",
                  top: 12,
                  left: 12,
                  zIndex: 50,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: "var(--panel)",
                  border: "1px solid var(--hairline)",
                  boxShadow: "var(--shadow-sm)",
                  color: "var(--muted)",
                  cursor: "pointer",
                  transition: "background var(--dur-fast), color var(--dur-fast)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M6 2L11 7L6 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            {/* Page content */}
            <main
              id="main-content"
              className="shell-main-content"
              style={{ flex: 1 }}
            >
              {children}
            </main>
          </div>

          {/* ── Optional right panel (desktop: beside content) ── */}
          {rightPanel && (
            <aside
              aria-label="Side panel"
              className="shell-right-panel-mobile"
              style={{
                width: 320,
                flexShrink: 0,
                borderLeft: "1px solid var(--hairline)",
                background: "var(--panel)",
                overflowY: "auto",
              }}
            >
              {rightPanel}
            </aside>
          )}
        </div>
      </div>

      {/* ── Command palette ───────────────────────────── */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        syllabi={syllabi}
      />

      {/* ── Global keyboard shortcuts ─────────────────── */}
      <KeyboardShortcuts
        paletteOpen={paletteOpen}
        onOpenPalette={openPalette}
        shortcutsOpen={shortcutsOpen}
        onOpenShortcuts={openShortcuts}
        onCloseShortcuts={() => setShortcutsOpen(false)}
      />
    </ShellContext.Provider>
  );
}

/* ─── Bare shell (no sidebar — used by /session, /block, /login) */
export function BareShell({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: "100dvh" }}>{children}</div>;
}

/* ─── Shell gate: picks shell based on route ─────────────── */
export function ShellGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (
    pathname === "/login" ||
    pathname.startsWith("/session") ||
    pathname.startsWith("/block")
  ) {
    return <BareShell>{children}</BareShell>;
  }
  return <AppShell>{children}</AppShell>;
}

/* ─── Content container helper ───────────────────────────── */
/**
 * Wraps page content in a max-width container with standard padding.
 * Usage: wrap the inner content of any page in <PageContent>.
 *
 * Props:
 *   - maxWidth: override the default content max-width (default: "var(--content-max)")
 *   - padding: horizontal padding (default: "32px")
 *   - className: extra Tailwind classes if needed
 */
export function PageContent({
  children,
  maxWidth = "var(--content-max)",
  padding = "32px",
  className,
  style,
}: {
  children: ReactNode;
  maxWidth?: string;
  padding?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth,
        margin: "0 auto",
        padding: `0 ${padding}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
