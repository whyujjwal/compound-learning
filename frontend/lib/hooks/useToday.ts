"use client";

/**
 * Home / Today screen hooks.
 * Endpoints: GET /api/queue/daily, GET /api/queue/extra, GET /api/stats, GET /api/stats/activity
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DailyQueue, QueueItem, Stats } from "@/lib/api/types";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const todayKeys = {
  queue: ["today", "queue"] as const,
  stats: ["today", "stats"] as const,
  activity: (days: number) => ["today", "activity", days] as const,
  extraQueue: (slug: string) => ["today", "extra", slug] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetches the daily queue (blocks + items) for the authenticated user.
 * Hits: GET /api/queue/daily
 * Returns: UseQueryResult<DailyQueue>
 */
export function useDailyQueue() {
  return useQuery<DailyQueue>({
    queryKey: todayKeys.queue,
    queryFn: () => api.getDailyQueue(),
    staleTime: 30_000,
  });
}

/**
 * Fetches global stats for the authenticated user.
 * Hits: GET /api/stats
 * Returns: UseQueryResult<Stats>
 */
export function useStats() {
  return useQuery<Stats>({
    queryKey: todayKeys.stats,
    queryFn: () => api.getStats(),
    staleTime: 60_000,
  });
}

/**
 * Fetches activity heatmap data for the given number of days.
 * Hits: GET /api/stats/activity?days={days}
 * Returns: UseQueryResult<{ date: string; count: number }[]>
 */
export function useActivity(days = 112) {
  return useQuery<{ date: string; count: number }[]>({
    queryKey: todayKeys.activity(days),
    queryFn: () => api.getActivity(days),
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetches extra queue items for a given track slug.
 * Hits: GET /api/queue/extra?track={slug}&count=5
 * Returns: UseQueryResult<QueueItem[]>
 *
 * Not auto-fetched — call refetch() to load more items imperatively.
 */
export function useExtraQueue(slug: string, count = 5, excludeCardIds: string[] = []) {
  return useQuery<QueueItem[]>({
    queryKey: todayKeys.extraQueue(slug),
    queryFn: () => api.getExtraQueue(slug, count, excludeCardIds),
    enabled: false, // fetched imperatively via refetch()
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Invalidates the daily queue and stats (e.g. after completing a review block).
 */
export function useInvalidateToday() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: todayKeys.queue }),
      qc.invalidateQueries({ queryKey: todayKeys.stats }),
    ]);
}
