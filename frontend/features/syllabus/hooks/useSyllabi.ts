"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { syllabusApi } from "@/features/syllabus/api/endpoints";
import { overviewTrackToSyllabusListItem } from "@/features/syllabus/types";
import { queryKeys } from "@/lib/query/keys";

export function useSyllabiFromOverview() {
  return useQuery({
    queryKey: queryKeys.syllabi,
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

export function useSyllabusBySlug(slug: string) {
  return useQuery({
    queryKey: queryKeys.syllabus(slug),
    queryFn: async () => {
      try {
        return await syllabusApi.getSyllabusBySlug(slug);
      } catch {
        const [progress, tracks] = await Promise.all([
          api.getTrackProgress(slug),
          api.getTracks(),
        ]);
        const track = tracks.find((t) => t.slug === slug);
        const { progressToSyllabusDetail } = await import("@/features/syllabus/types");
        return progressToSyllabusDetail(progress, track);
      }
    },
    enabled: Boolean(slug),
    staleTime: 15_000,
  });
}
