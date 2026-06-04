"use client";

/**
 * Library / Syllabus hooks.
 * Endpoints: /api/syllabi/*, /api/tracks/slug/{slug}/progress, /api/curriculum/overview
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { syllabusApi } from "@/features/syllabus/api/endpoints";
import {
  overviewTrackToSyllabusListItem,
  progressToSyllabusDetail,
} from "@/features/syllabus/types";
import type { SyllabusDetail, SyllabusListItem, SyllabusProposal } from "@/features/syllabus/types";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const syllabusKeys = {
  list: ["syllabi"] as const,
  detail: (slug: string) => ["syllabus", slug] as const,
  materials: (id: string, filters?: string) =>
    ["syllabus", id, "materials", filters ?? "all"] as const,
  proposals: (id: string) => ["syllabus", id, "proposals"] as const,
  history: (id: string) => ["syllabus", id, "history"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetches the user's library (list of syllabi).
 * Hits: GET /api/syllabi (falls back to GET /api/curriculum/overview on failure)
 * Returns: UseQueryResult<SyllabusListItem[]>
 */
export function useSyllabiList() {
  return useQuery<SyllabusListItem[]>({
    queryKey: syllabusKeys.list,
    queryFn: async () => {
      try {
        return await syllabusApi.listSyllabi();
      } catch {
        const overview = await api.getCurriculumOverview();
        return overview.tracks.map(overviewTrackToSyllabusListItem);
      }
    },
  });
}

/**
 * Fetches a single syllabus detail by slug.
 * Hits: GET /api/syllabi/slug/{slug} (falls back to track progress + tracks)
 * Returns: UseQueryResult<SyllabusDetail>
 */
export function useSyllabusDetail(slug: string) {
  return useQuery<SyllabusDetail>({
    queryKey: syllabusKeys.detail(slug),
    queryFn: async () => {
      try {
        return await syllabusApi.getSyllabusBySlug(slug);
      } catch {
        const [progress, tracks] = await Promise.all([
          api.getTrackProgress(slug),
          api.getTracks(),
        ]);
        const track = tracks.find((t) => t.slug === slug);
        return progressToSyllabusDetail(progress, track);
      }
    },
    enabled: Boolean(slug),
    staleTime: 15_000,
  });
}

/**
 * Fetches the proposals (AI diff proposals) for a syllabus.
 * Hits: GET /api/syllabi/{syllabusId}/proposals
 * Returns: UseQueryResult<SyllabusProposal[]>
 */
export function useSyllabusProposals(syllabusId: string) {
  return useQuery<SyllabusProposal[]>({
    queryKey: syllabusKeys.proposals(syllabusId),
    queryFn: () => syllabusApi.listProposals(syllabusId),
    enabled: Boolean(syllabusId),
    staleTime: 10_000,
  });
}

/**
 * Fetches the paginated materials for a syllabus.
 * Hits: GET /api/syllabi/{syllabusId}/materials
 * Returns: UseQueryResult<{ items: ..., total: number }>
 */
export function useSyllabusMaterials(
  syllabusId: string,
  params?: { q?: string; limit?: number; offset?: number }
) {
  const filterKey = params ? JSON.stringify(params) : "all";
  return useQuery({
    queryKey: syllabusKeys.materials(syllabusId, filterKey),
    queryFn: () => syllabusApi.listMaterials(syllabusId, params),
    enabled: Boolean(syllabusId),
  });
}

/**
 * Fetches the change history log for a syllabus.
 * Hits: GET /api/syllabi/{syllabusId}/history
 * Returns: UseQueryResult<ChangeLogEntry[]>
 */
export function useSyllabusHistory(syllabusId: string) {
  return useQuery({
    queryKey: syllabusKeys.history(syllabusId),
    queryFn: () => syllabusApi.getHistory(syllabusId),
    enabled: Boolean(syllabusId),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Creates a new syllabus.
 * Hits: POST /api/syllabi
 * Invalidates: syllabusKeys.list
 */
export function useCreateSyllabus() {
  const qc = useQueryClient();
  return useMutation<
    SyllabusDetail,
    Error,
    { slug: string; name: string; summary?: string; visibility?: "PUBLIC" | "PRIVATE"; color?: string }
  >({
    mutationFn: (data) => syllabusApi.createSyllabus(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: syllabusKeys.list }),
  });
}

/**
 * Adds a module to a syllabus.
 * Hits: POST /api/syllabi/{syllabusId}/modules
 * Invalidates: detail for the syllabus
 */
export function useAddModule(syllabusId: string) {
  const qc = useQueryClient();
  return useMutation<SyllabusDetail, Error, { title: string; objective?: string }>({
    mutationFn: (data) => syllabusApi.addModule(syllabusId, data),
    onSuccess: (updated) => {
      qc.setQueryData(syllabusKeys.detail(updated.slug), updated);
    },
  });
}

/**
 * Removes a module from a syllabus.
 * Hits: DELETE /api/syllabi/{syllabusId}/modules/{moduleId}
 */
export function useDeleteModule(syllabusId: string, syllabusSlug: string) {
  const qc = useQueryClient();
  return useMutation<SyllabusDetail, Error, { moduleId: string }>({
    mutationFn: ({ moduleId }) => syllabusApi.deleteModule(syllabusId, moduleId),
    onSuccess: (updated) => {
      qc.setQueryData(syllabusKeys.detail(syllabusSlug), updated);
    },
  });
}

/**
 * Adds a material to a syllabus.
 * Hits: POST /api/syllabi/{syllabusId}/materials
 */
export function useAddMaterial(syllabusId: string, syllabusSlug: string) {
  const qc = useQueryClient();
  return useMutation<
    SyllabusDetail,
    Error,
    { title: string; module_id?: string; external_url?: string; resource_type?: string }
  >({
    mutationFn: (data) => syllabusApi.addMaterial(syllabusId, data),
    onSuccess: (updated) => {
      qc.setQueryData(syllabusKeys.detail(syllabusSlug), updated);
      qc.invalidateQueries({ queryKey: syllabusKeys.materials(syllabusId) });
    },
  });
}

/**
 * Removes a material from a syllabus.
 * Hits: DELETE /api/syllabi/{syllabusId}/materials/{materialId}
 */
export function useDeleteMaterial(syllabusId: string, syllabusSlug: string) {
  const qc = useQueryClient();
  return useMutation<SyllabusDetail, Error, { materialId: string }>({
    mutationFn: ({ materialId }) => syllabusApi.deleteMaterial(syllabusId, materialId),
    onSuccess: (updated) => {
      qc.setQueryData(syllabusKeys.detail(syllabusSlug), updated);
      qc.invalidateQueries({ queryKey: syllabusKeys.materials(syllabusId) });
    },
  });
}

/**
 * Creates an AI proposal for a syllabus.
 * Hits: POST /api/syllabi/{syllabusId}/proposals/ai
 * Invalidates: proposals for the syllabus
 */
export function useCreateAiProposal(syllabusId: string) {
  const qc = useQueryClient();
  return useMutation<SyllabusProposal, Error, { instruction: string }>({
    mutationFn: ({ instruction }) => syllabusApi.createAiProposal(syllabusId, instruction),
    onSuccess: () => qc.invalidateQueries({ queryKey: syllabusKeys.proposals(syllabusId) }),
  });
}

/**
 * Applies a proposal (all or selected operations).
 * Hits: POST /api/syllabi/{syllabusId}/proposals/{proposalId}/apply
 * Invalidates: detail + proposals
 */
export function useApplyProposal(syllabusId: string, syllabusSlug: string) {
  const qc = useQueryClient();
  return useMutation<
    SyllabusProposal,
    Error,
    { proposalId: string; operationIds?: string[] }
  >({
    mutationFn: ({ proposalId, operationIds }) =>
      syllabusApi.applyProposal(syllabusId, proposalId, operationIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: syllabusKeys.detail(syllabusSlug) });
      qc.invalidateQueries({ queryKey: syllabusKeys.proposals(syllabusId) });
    },
  });
}

/**
 * Rejects a proposal.
 * Hits: POST /api/syllabi/{syllabusId}/proposals/{proposalId}/reject
 * Invalidates: proposals
 */
export function useRejectProposal(syllabusId: string) {
  const qc = useQueryClient();
  return useMutation<SyllabusProposal, Error, { proposalId: string }>({
    mutationFn: ({ proposalId }) => syllabusApi.rejectProposal(syllabusId, proposalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: syllabusKeys.proposals(syllabusId) }),
  });
}
