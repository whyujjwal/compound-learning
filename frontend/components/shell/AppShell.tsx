"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Sidebar, type SyllabusEntry } from "./Sidebar";
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

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);
  const setRightPanel = useCallback((node: ReactNode | null) => setRightPanelState(node), []);
  const setSyllabi = useCallback((entries: SyllabusEntry[]) => setSyllabiState(entries), []);

  const ctx: ShellContextValue = useMemo(
    () => ({ openPalette, openShortcuts, setRightPanel, sidebarCollapsed, toggleSidebar, syllabi, setSyllabi }),
    [openPalette, openShortcuts, setRightPanel, sidebarCollapsed, toggleSidebar, syllabi, setSyllabi]
  );

  return (
    <ShellContext.Provider value={ctx}>
      <div style={{ display: "flex", minHeight: "100dvh" }}>
        {/* ── Left sidebar ─────────────────────────────── */}
        <Sidebar
          syllabi={syllabi}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onOpenPalette={openPalette}
          workspaceName={workspaceName}
        />

        {/* ── Content area ─────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Mobile sidebar toggle (visible only when sidebar is hidden on small screens) */}
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
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
            style={{ flex: 1 }}
          >
            {children}
          </main>
        </div>

        {/* ── Optional right panel ─────────────────────── */}
        {rightPanel && (
          <aside
            aria-label="Side panel"
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
