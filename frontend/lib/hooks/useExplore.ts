"use client";

/**
 * Explore / Catalog hooks.
 * Endpoints: /api/catalog/*, /api/catalog/explore
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CatalogTrack, CatalogTrackDetail, CatalogCollection, Leaderboards, CreatorProfile } from "@/lib/api/types";
import type { PaginationParams } from "@/lib/api/client";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const exploreKeys = {
  tracks: (params?: Record<string, unknown>) => ["catalog", "tracks", params ?? {}] as const,
  track: (id: string) => ["catalog", "track", id] as const,
  collections: ["catalog", "collections"] as const,
  leaderboards: ["catalog", "leaderboards"] as const,
  creator: (id: string) => ["catalog", "creator", id] as const,
  exploreAll: ["catalog", "explore"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetches the catalog track list with optional filtering.
 * Hits: GET /api/catalog/tracks[?q=...&featured=...&sort=...]
 * Returns: UseQueryResult<CatalogTrack[]>
 */
export function useCatalogTracks(params?: {
  q?: string;
  featured?: boolean;
  sort?: "ranking" | "stars" | "new";
} & PaginationParams) {
  return useQuery<CatalogTrack[]>({
    queryKey: exploreKeys.tracks(params as Record<string, unknown>),
    queryFn: () => api.getCatalogTracks(params),
    staleTime: 60_000,
  });
}

/**
 * Fetches a single catalog track by ID.
 * Hits: GET /api/catalog/tracks/{id}
 * Returns: UseQueryResult<CatalogTrackDetail>
 */
export function useCatalogTrack(id: string) {
  return useQuery<CatalogTrackDetail>({
    queryKey: exploreKeys.track(id),
    queryFn: () => api.getCatalogTrack(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

/**
 * Fetches catalog collections.
 * Hits: GET /api/catalog/collections
 * Returns: UseQueryResult<CatalogCollection[]>
 */
export function useCatalogCollections(params?: PaginationParams & { trackLimit?: number; trackOffset?: number }) {
  return useQuery<CatalogCollection[]>({
    queryKey: exploreKeys.collections,
    queryFn: () => api.getCatalogCollections(params),
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetches catalog leaderboards (top tracks + top creators).
 * Hits: GET /api/catalog/leaderboards
 * Returns: UseQueryResult<Leaderboards>
 */
export function useCatalogLeaderboards() {
  return useQuery<Leaderboards>({
    queryKey: exploreKeys.leaderboards,
    queryFn: () => api.getLeaderboards(),
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetches a creator profile.
 * Hits: GET /api/catalog/creators/{id}
 * Returns: UseQueryResult<CreatorProfile>
 */
export function useCreatorProfile(id: string) {
  return useQuery<CreatorProfile>({
    queryKey: exploreKeys.creator(id),
    queryFn: () => api.getCreatorProfile(id),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Stars a catalog track.
 * Hits: POST /api/catalog/tracks/{id}/star
 * Optimistically updates the track in cache.
 */
export function useStarCatalogTrack() {
  const qc = useQueryClient();
  return useMutation<CatalogTrack, Error, { id: string }>({
    mutationFn: ({ id }) => api.starCatalogTrack(id),
    onSuccess: (updated, { id }) => {
      qc.setQueryData<CatalogTrackDetail>(exploreKeys.track(id), (prev) =>
        prev ? { ...prev, ...updated } : undefined
      );
    },
  });
}

/**
 * Unstars a catalog track.
 * Hits: DELETE /api/catalog/tracks/{id}/star
 */
export function useUnstarCatalogTrack() {
  const qc = useQueryClient();
  return useMutation<CatalogTrack, Error, { id: string }>({
    mutationFn: ({ id }) => api.unstarCatalogTrack(id),
    onSuccess: (updated, { id }) => {
      qc.setQueryData<CatalogTrackDetail>(exploreKeys.track(id), (prev) =>
        prev ? { ...prev, ...updated } : undefined
      );
    },
  });
}

/**
 * Adopts a catalog track into the user's library.
 * Hits: POST /api/catalog/tracks/{id}/adopt
 * Returns: { track_id, slug, materials_created }
 */
export function useAdoptCatalogTrack() {
  const qc = useQueryClient();
  return useMutation<{ track_id: string; slug: string; materials_created: number }, Error, { id: string }>({
    mutationFn: ({ id }) => api.adoptCatalogTrack(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["syllabi"] });
      qc.invalidateQueries({ queryKey: ["today"] });
    },
  });
}

/**
 * Rates a catalog track.
 * Hits: POST /api/catalog/tracks/{id}/rate
 */
export function useRateCatalogTrack() {
  const qc = useQueryClient();
  return useMutation<CatalogTrack, Error, { id: string; rating: number; note?: string }>({
    mutationFn: ({ id, rating, note }) => api.rateCatalogTrack(id, rating, note),
    onSuccess: (updated, { id }) => {
      qc.setQueryData<CatalogTrackDetail>(exploreKeys.track(id), (prev) =>
        prev ? { ...prev, ...updated } : undefined
      );
    },
  });
}
