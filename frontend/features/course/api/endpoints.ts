import { request } from "@/lib/api/client";
import type { CourseTree, RoadmapGraph } from "../types";

export const courseApi = {
  getCourseTree: (slug: string) => request<CourseTree>(`/syllabi/${slug}/tree`),
  getRoadmap: (slug: string) => request<RoadmapGraph>(`/syllabi/${slug}/roadmap`),
};
