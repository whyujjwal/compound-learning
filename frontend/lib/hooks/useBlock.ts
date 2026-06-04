"use client";

/**
 * Block session hooks.
 * Endpoints: GET /api/blocks/{slot}, POST /api/blocks/{slot}/start,
 *            POST /api/blocks/{slot}/items/{card_id}/review
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BlockSession } from "@/lib/api/types";
import { todayKeys } from "./useToday";

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Starts a block session for the given slot (or fetches an existing one).
 * Hits: POST /api/blocks/{slot}/start
 * Returns: UseMutationResult<BlockSession, Error, { slot: number }>
 */
export function useStartBlockSession() {
  return useMutation<BlockSession, Error, { slot: number }>({
    mutationFn: ({ slot }) => api.startBlockSession(slot),
  });
}

/**
 * Submits a card review within a block session.
 * Hits: POST /api/blocks/{slot}/items/{cardId}/review
 * Invalidates: today queue after block review
 *
 * @example
 * const { mutate } = useSubmitBlockReview();
 * mutate({ slot: 1, cardId: "abc", rating: "good", elapsed: 30 });
 */
export function useSubmitBlockReview() {
  const qc = useQueryClient();
  return useMutation<
    BlockSession,
    Error,
    { slot: number; cardId: string; rating: string; elapsed: number }
  >({
    mutationFn: ({ slot, cardId, rating, elapsed }) =>
      api.submitBlockReview(slot, cardId, rating, elapsed),
    onSuccess: (session) => {
      if (session.status === "COMPLETED") {
        qc.invalidateQueries({ queryKey: todayKeys.queue });
        qc.invalidateQueries({ queryKey: todayKeys.stats });
      }
    },
  });
}
