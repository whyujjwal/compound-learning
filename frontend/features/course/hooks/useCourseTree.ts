"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { courseApi } from "../api/endpoints";

export function useCourseTree(slug: string) {
  return useQuery({
    queryKey: queryKeys.courseTree(slug),
    queryFn: () => courseApi.getCourseTree(slug),
    enabled: Boolean(slug),
  });
}
