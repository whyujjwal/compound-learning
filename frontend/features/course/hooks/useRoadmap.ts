"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { courseApi } from "../api/endpoints";

export function useRoadmap(slug: string) {
  return useQuery({
    queryKey: queryKeys.roadmap(slug),
    queryFn: () => courseApi.getRoadmap(slug),
    enabled: Boolean(slug),
  });
}
