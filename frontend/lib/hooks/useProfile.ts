"use client";

/**
 * Profile screen hooks.
 * Endpoints: GET/PATCH /api/user/me, GET /api/stats, GET /api/stats/activity
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User, Stats, WeeklySchedule } from "@/lib/api/types";
import { todayKeys } from "./useToday";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const profileKeys = {
  user: ["profile", "user"] as const,
  stats: todayKeys.stats,
  activity: todayKeys.activity,
  retentionTimeline: (days: number) => ["profile", "retention-timeline", days] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetches the authenticated user's profile.
 * Hits: GET /api/user/me
 * Returns: UseQueryResult<User>
 */
export function useUser() {
  return useQuery<User>({
    queryKey: profileKeys.user,
    queryFn: () => api.getUser(),
    staleTime: 60_000,
  });
}

/**
 * Fetches user stats (reviews, retention, streak, etc.).
 * Hits: GET /api/stats
 * Returns: UseQueryResult<Stats>
 */
export function useProfileStats() {
  return useQuery<Stats>({
    queryKey: profileKeys.stats,
    queryFn: () => api.getStats(),
    staleTime: 60_000,
  });
}

/**
 * Fetches the retention timeline for sparkline display.
 * Hits: GET /api/stats/retention-timeline?days={days}
 * Returns: UseQueryResult<{ date: string; retention: number; reviews: number }[]>
 */
export function useRetentionTimeline(days = 30) {
  return useQuery<{ date: string; retention: number; reviews: number }[]>({
    queryKey: profileKeys.retentionTimeline(days),
    queryFn: () => api.getRetentionTimeline(days),
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Updates the authenticated user's profile preferences.
 * Hits: PATCH /api/user/me
 * Invalidates: profile.user, profile.stats
 *
 * @example
 * const { mutate } = useUpdateUser();
 * mutate({ display_name: "Alice", target_retention: 0.9, daily_study_minutes: 90 });
 */
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<
    User,
    Error,
    Partial<
      Pick<
        User,
        | "target_retention"
        | "daily_study_minutes"
        | "daily_new_cards"
        | "paused_tracks"
        | "display_name"
        | "milestone_title"
        | "milestone_date"
        | "learning_goals"
        | "onboarded"
      >
    > & { weekly_schedule?: WeeklySchedule }
  >({
    mutationFn: (data) => api.updateUser(data),
    onSuccess: (updated) => {
      qc.setQueryData(profileKeys.user, updated);
      qc.invalidateQueries({ queryKey: profileKeys.stats });
    },
  });
}
