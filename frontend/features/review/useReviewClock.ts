"use client";

/**
 * Session-scoped clock — persists elapsed time + pause state in sessionStorage
 * so refreshes don't reset the timer.  Shared by both session and block pages.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

type ClockState = {
  queueTs: number;
  startedAt: number;
  accumulatedPauseMs: number;
  pauseStartedAt: number | null;
};

const CLOCK_KEY = "compound:session-clock";

function loadClock(queueTs: number): ClockState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CLOCK_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as ClockState;
    return c.queueTs === queueTs ? c : null;
  } catch {
    return null;
  }
}

function saveClock(state: ClockState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CLOCK_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Returns elapsed seconds, paused state, and a togglePause callback.
 * @param queueTs  — stable epoch-ms identifier for the current session (queue start time).
 *                    Pass `null` while the queue is still loading.
 * @param running  — set to false when the session has ended to freeze the timer.
 */
export function useReviewClock(
  queueTs: number | null,
  running: boolean
): { elapsed: number; paused: boolean; togglePause: () => void } {
  const [clock, setClock] = useState<ClockState | null>(null);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Restore or initialize clock state.
  useEffect(() => {
    if (queueTs == null) return;
    const existing = loadClock(queueTs);
    if (existing) {
      setClock(existing);
      setPaused(Boolean(existing.pauseStartedAt));
      return;
    }
    const fresh: ClockState = {
      queueTs,
      startedAt: Date.now(),
      accumulatedPauseMs: 0,
      pauseStartedAt: null,
    };
    saveClock(fresh);
    setClock(fresh);
    setPaused(false);
  }, [queueTs]);

  const togglePause = useCallback(() => {
    setClock((prev) => {
      if (!prev) return prev;
      if (prev.pauseStartedAt) {
        const delta = Date.now() - prev.pauseStartedAt;
        const resumed: ClockState = {
          ...prev,
          accumulatedPauseMs: prev.accumulatedPauseMs + delta,
          pauseStartedAt: null,
        };
        saveClock(resumed);
        setPaused(false);
        return resumed;
      }
      const paused: ClockState = { ...prev, pauseStartedAt: Date.now() };
      saveClock(paused);
      setPaused(true);
      return paused;
    });
  }, []);

  // Tick once per second while running and not paused.
  useEffect(() => {
    if (!running || paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running, paused]);

  const elapsed = useMemo(() => {
    if (!clock) return 0;
    let pauseMs = clock.accumulatedPauseMs;
    if (clock.pauseStartedAt) pauseMs += now - clock.pauseStartedAt;
    return Math.max(0, Math.floor((now - clock.startedAt - pauseMs) / 1000));
  }, [clock, now]);

  return { elapsed, paused, togglePause };
}

/** "00:00" or "1:02:33" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "3m 12s" or "1h 4m" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
