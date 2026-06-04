"use client";

/**
 * Studio / Course tree and roadmap hooks.
 * Endpoints: GET /api/syllabi/{slug}/tree, GET /api/syllabi/{slug}/roadmap
 * Also: POST /api/syllabi/generate (AI-generated course)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseApi } from "@/features/course/api/endpoints";
import { generateCourse } from "@/features/course/api/mutations";
import type { CourseTree, RoadmapGraph, GenerateCourseRequest, GenerateCourseResponse } from "@/features/course/types";
import { syllabusKeys } from "./useSyllabi";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const courseKeys = {
  tree: (slug: string) => ["course", slug, "tree"] as const,
  roadmap: (slug: string) => ["course", slug, "roadmap"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetches the full course tree (outline) for a syllabus.
 * Hits: GET /api/syllabi/{slug}/tree
 * Returns: UseQueryResult<CourseTree>
 */
export function useCourseTree(slug: string) {
  return useQuery<CourseTree>({
    queryKey: courseKeys.tree(slug),
    queryFn: () => courseApi.getCourseTree(slug),
    enabled: Boolean(slug),
    staleTime: 30_000,
  });
}

/**
 * Fetches the roadmap graph (nodes + edges) for a syllabus.
 * Hits: GET /api/syllabi/{slug}/roadmap
 * Returns: UseQueryResult<RoadmapGraph>
 */
export function useRoadmapGraph(slug: string) {
  return useQuery<RoadmapGraph>({
    queryKey: courseKeys.roadmap(slug),
    queryFn: () => courseApi.getRoadmap(slug),
    enabled: Boolean(slug),
    staleTime: 30_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Generates a new AI course (syllabus + initial proposal).
 * Hits: POST /api/syllabi/generate  (routed through Next /api proxy for 120s timeout)
 * Invalidates: syllabusKeys.list
 * Returns: UseMutationResult<GenerateCourseResponse, Error, GenerateCourseRequest>
 */
export function useGenerateCourse() {
  const qc = useQueryClient();
  return useMutation<GenerateCourseResponse, Error, GenerateCourseRequest>({
    mutationFn: generateCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: syllabusKeys.list }),
  });
}
