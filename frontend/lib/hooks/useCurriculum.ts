"use client";

/**
 * Curriculum hooks.
 * Endpoints: GET /api/curriculum/overview, GET/PUT /api/curriculum/schedule,
 *            GET /api/curriculum/schedule/today, POST /api/curriculum/generate,
 *            POST /api/curriculum/import/examples, GET /api/curriculum/generations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CurriculumOverview,
  WeeklySchedule,
  GeneratedRoadmap,
  RoadmapGenerationSummary,
} from "@/lib/api/types";
import { todayKeys } from "./useToday";
import { syllabusKeys } from "./useSyllabi";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const curriculumKeys = {
  overview: ["curriculum", "overview"] as const,
  schedule: ["curriculum", "schedule"] as const,
  todaySchedule: ["curriculum", "schedule", "today"] as const,
  generations: ["curriculum", "generations"] as const,
  generation: (id: string) => ["curriculum", "generations", id] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetches the curriculum overview (track breakdown, stats, today's blocks).
 * Hits: GET /api/curriculum/overview
 * Returns: UseQueryResult<CurriculumOverview>
 */
export function useCurriculumOverview() {
  return useQuery<CurriculumOverview>({
    queryKey: curriculumKeys.overview,
    queryFn: () => api.getCurriculumOverview(),
    staleTime: 30_000,
  });
}

/**
 * Fetches the user's weekly schedule.
 * Hits: GET /api/curriculum/schedule
 * Returns: UseQueryResult<WeeklySchedule>
 */
export function useWeeklySchedule() {
  return useQuery<WeeklySchedule>({
    queryKey: curriculumKeys.schedule,
    queryFn: () => api.getWeeklySchedule(),
    staleTime: 60_000,
  });
}

/**
 * Fetches today's schedule blocks.
 * Hits: GET /api/curriculum/schedule/today
 * Returns: UseQueryResult<{ block: number; track: string; track_name: string | null }[]>
 */
export function useTodaySchedule() {
  return useQuery<{ block: number; track: string; track_name: string | null }[]>({
    queryKey: curriculumKeys.todaySchedule,
    queryFn: () => api.getTodaySchedule(),
    staleTime: 30_000,
  });
}

/**
 * Fetches the list of past roadmap generation runs.
 * Hits: GET /api/curriculum/generations
 * Returns: UseQueryResult<RoadmapGenerationSummary[]>
 */
export function useRoadmapGenerations() {
  return useQuery<RoadmapGenerationSummary[]>({
    queryKey: curriculumKeys.generations,
    queryFn: () => api.listRoadmapGenerations(),
    staleTime: 60_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Generates a personalized roadmap using AI.
 * Hits: POST /api/curriculum/generate (proxied through Next.js /api for extended timeout)
 * Invalidates: overview, syllabi list, today queue
 *
 * @example
 * const { mutate } = useGenerateRoadmap();
 * mutate({ goals: "Learn distributed systems", weekly_hours: 10 });
 */
export function useGenerateRoadmap() {
  const qc = useQueryClient();
  return useMutation<
    GeneratedRoadmap,
    Error,
    { goals: string; weekly_hours?: number; level?: string; apply?: boolean; replace?: boolean }
  >({
    mutationFn: (data) => api.generateRoadmap(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: curriculumKeys.overview });
      qc.invalidateQueries({ queryKey: syllabusKeys.list });
      qc.invalidateQueries({ queryKey: todayKeys.queue });
    },
  });
}

/**
 * Sets the user's weekly schedule.
 * Hits: PUT /api/curriculum/schedule
 * Invalidates: schedule + today schedule
 */
export function useSetWeeklySchedule() {
  const qc = useQueryClient();
  return useMutation<WeeklySchedule, Error, WeeklySchedule>({
    mutationFn: (schedule) => api.setWeeklySchedule(schedule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: curriculumKeys.schedule });
      qc.invalidateQueries({ queryKey: curriculumKeys.todaySchedule });
      qc.invalidateQueries({ queryKey: todayKeys.queue });
    },
  });
}

/**
 * Imports example curriculum tracks (seed data).
 * Hits: POST /api/curriculum/import/examples
 * Invalidates: overview + syllabi list + today queue
 */
export function useImportExampleCurriculum() {
  const qc = useQueryClient();
  return useMutation<Record<string, number>, Error, void>({
    mutationFn: () => api.importExampleCurriculum(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: curriculumKeys.overview });
      qc.invalidateQueries({ queryKey: syllabusKeys.list });
      qc.invalidateQueries({ queryKey: todayKeys.queue });
    },
  });
}

/**
 * Imports the default curriculum.
 * Hits: POST /api/curriculum/import/default
 */
export function useImportDefaultCurriculum() {
  const qc = useQueryClient();
  return useMutation<Record<string, number>, Error, void>({
    mutationFn: () => api.importCurriculum(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: curriculumKeys.overview });
      qc.invalidateQueries({ queryKey: syllabusKeys.list });
      qc.invalidateQueries({ queryKey: todayKeys.queue });
    },
  });
}
