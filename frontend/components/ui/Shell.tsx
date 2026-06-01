"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { AppBar } from "./AppBar";
import { LeftRail } from "./LeftRail";
import { CommandPalette } from "./CommandPalette";
import {
  api,
  type CurriculumOverview,
  type DailyQueue,
  type Stats,
  type Track,
} from "@/lib/api";

type ShellCtx = {
  tracks: Track[];
  overview: CurriculumOverview | null;
  queue: DailyQueue | null;
  stats: Stats | null;
  activity: { date: string; count: number }[];
  reloadAll: () => Promise<void>;
  reloadQueue: () => Promise<void>;
  openCmdk: () => void;
  togglePanel: () => void;
  panelOpen: boolean;
  mobileNavOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
  setRightPanel: (node: ReactNode | null) => void;
  setActions: (actions: {
    onStartFirstBlock?: () => void;
    onPushMore?: (slug: string) => void;
    onRefreshNudge?: () => void;
  }) => void;
};

const Ctx = createContext<ShellCtx | null>(null);

export function useShell(): ShellCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShell must be inside <Shell>");
  return v;
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";

  const [tracks, setTracks] = useState<Track[]>([]);
  const [overview, setOverview] = useState<CurriculumOverview | null>(null);
  const [queue, setQueue] = useState<DailyQueue | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<{ date: string; count: number }[]>([]);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [rightPanelNode, setRightPanelNode] = useState<ReactNode | null>(null);
  const [actions, setActionsState] = useState<{
    onStartFirstBlock?: () => void;
    onPushMore?: (slug: string) => void;
    onRefreshNudge?: () => void;
  }>({});

  const reloadAll = useCallback(async () => {
    try {
      const [t, o, q, s, a] = await Promise.all([
        api.getTracks(),
        api.getCurriculumOverview(),
        api.getDailyQueue().catch(() => null),
        api.getStats().catch(() => null),
        api.getActivity(112).catch(() => []),
      ]);
      setTracks(t);
      setOverview(o);
      setQueue(q);
      setStats(s);
      setActivity(a);
    } catch {
      // tolerate partial failures
    }
  }, []);

  const reloadQueue = useCallback(async () => {
    try {
      const q = await api.getDailyQueue();
      setQueue(q);
    } catch {}
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Refresh queue/stats when returning to Today
  useEffect(() => {
    if (pathname === "/") {
      reloadQueue();
      api.getStats().then(setStats).catch(() => {});
    }
  }, [pathname, reloadQueue]);

  // Close mobile nav on every route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  // ESC closes the drawer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileNavOpen) setMobileNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);
  const openCmdk = useCallback(() => setCmdkOpen(true), []);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((v) => !v), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const setRightPanel = useCallback((node: ReactNode | null) => setRightPanelNode(node), []);
  const setActions = useCallback(
    (a: {
      onStartFirstBlock?: () => void;
      onPushMore?: (slug: string) => void;
      onRefreshNudge?: () => void;
    }) => setActionsState(a),
    []
  );

  const ctx: ShellCtx = useMemo(
    () => ({
      tracks,
      overview,
      queue,
      stats,
      activity,
      reloadAll,
      reloadQueue,
      openCmdk,
      togglePanel,
      panelOpen,
      mobileNavOpen,
      toggleMobileNav,
      closeMobileNav,
      setRightPanel,
      setActions,
    }),
    [
      tracks,
      overview,
      queue,
      stats,
      activity,
      reloadAll,
      reloadQueue,
      openCmdk,
      togglePanel,
      panelOpen,
      mobileNavOpen,
      toggleMobileNav,
      closeMobileNav,
      setRightPanel,
      setActions,
    ]
  );

  const showPanel = panelOpen && Boolean(rightPanelNode);
  const bodyClass = `shell-body${showPanel ? "" : " no-panel"}${
    mobileNavOpen ? " nav-open" : ""
  }`;

  return (
    <Ctx.Provider value={ctx}>
      <div className="shell">
        <AppBar
          onOpenCmdk={openCmdk}
          onTogglePanel={togglePanel}
          panelOpen={panelOpen}
          onToggleNav={toggleMobileNav}
          navOpen={mobileNavOpen}
        />
        <div className={bodyClass}>
          <LeftRail tracks={tracks} overview={overview} />
          <main className="shell-main">{children}</main>
          {showPanel ? rightPanelNode : null}
          {mobileNavOpen && (
            <div
              className="nav-backdrop"
              role="button"
              aria-label="Close menu"
              onClick={closeMobileNav}
            />
          )}
        </div>
      </div>

      <CommandPalette
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        tracks={tracks}
        onStartFirstBlock={actions.onStartFirstBlock}
        onPushMore={actions.onPushMore}
        onRefreshNudge={actions.onRefreshNudge}
        onTogglePanel={togglePanel}
      />
    </Ctx.Provider>
  );
}

// Bare layout (no shell) used by /session for focused work.
export function BareShell({ children }: { children: ReactNode }) {
  return <div className="shell-bare">{children}</div>;
}
