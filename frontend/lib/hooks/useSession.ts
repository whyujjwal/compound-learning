"use client";

/**
 * Session / Card review hooks.
 * Endpoints: GET /api/cards/{id}, POST /api/cards/{id}/review
 * Also covers study session logging: POST /api/sessions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CardDetail, QueueItem, StudySession } from "@/lib/api/types";
import { todayKeys } from "./useToday";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const sessionKeys = {
  card: (id: string) => ["card", id] as const,
  recentSessions: (limit: number) => ["sessions", "recent", limit] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetches a single card by ID.
 * Hits: GET /api/cards/{id}
 * Returns: UseQueryResult<CardDetail>
 */
export function useCard(id: string) {
  return useQuery<CardDetail>({
    queryKey: sessionKeys.card(id),
    queryFn: () => api.getCard(id),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

/**
 * Fetches recent study sessions.
 * Hits: GET /api/sessions/recent?limit={limit}
 * Returns: UseQueryResult<StudySession[]>
 */
export function useRecentSessions(limit = 20) {
  return useQuery<StudySession[]>({
    queryKey: sessionKeys.recentSessions(limit),
    queryFn: () => api.getRecentSessions(limit),
    staleTime: 30_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Submits a card review rating (outside a block session).
 * Hits: POST /api/cards/{cardId}/review
 * Invalidates: today queue + stats after review
 *
 * @example
 * const { mutate } = useSubmitReview();
 * mutate({ cardId, rating: "good", elapsed: 45 });
 */
export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation<
    { card: { due_at: string; reps: number } },
    Error,
    { cardId: string; rating: string; elapsed: number }
  >({
    mutationFn: ({ cardId, rating, elapsed }) => api.submitReview(cardId, rating, elapsed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: todayKeys.queue });
      qc.invalidateQueries({ queryKey: todayKeys.stats });
    },
  });
}

/**
 * Logs a study session (material viewed/completed).
 * Hits: POST /api/sessions
 * Returns: UseMutationResult<StudySession>
 */
export function useLogSession() {
  const qc = useQueryClient();
  return useMutation<
    StudySession,
    Error,
    {
      material_id: string;
      duration_minutes?: number;
      completion_status?: "STARTED" | "COMPLETED" | "SKIPPED";
      self_rating?: number;
      notes?: string;
      external_evidence_url?: string;
    }
  >({
    mutationFn: (data) => api.logSession(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: todayKeys.stats });
    },
  });
}

/**
 * Marks a material as completed.
 * Hits: POST /api/materials/{materialId}/complete
 */
export function useCompleteMaterial() {
  const qc = useQueryClient();
  return useMutation<StudySession, Error, { materialId: string; notes?: string }>({
    mutationFn: ({ materialId, notes }) => api.completeMaterial(materialId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: todayKeys.queue });
      qc.invalidateQueries({ queryKey: todayKeys.stats });
    },
  });
}
