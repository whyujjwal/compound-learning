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

  const openCmdk = useCallback(() => setCmdkOpen(true), []);
  const setRightPanel = useCallback((_node: ReactNode | null) => {}, []);
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
      setRightPanel,
      setActions,
    ]
  );

  return (
    <Ctx.Provider value={ctx}>
      <div className="shell">
        <AppBar onOpenCmdk={openCmdk} />
        <div className="shell-body">
          <main className="shell-main">{children}</main>
        </div>
      </div>

      <CommandPalette
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        tracks={tracks}
        onStartFirstBlock={actions.onStartFirstBlock}
        onPushMore={actions.onPushMore}
        onRefreshNudge={actions.onRefreshNudge}
      />
    </Ctx.Provider>
  );
}

// Bare layout (no shell) used by /session for focused work.
export function BareShell({ children }: { children: ReactNode }) {
  return <div className="shell-bare">{children}</div>;
}
