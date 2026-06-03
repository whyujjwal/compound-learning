export const queryKeys = {
  syllabi: ["syllabi"] as const,
  syllabus: (idOrSlug: string) => ["syllabus", idOrSlug] as const,
  syllabusMaterials: (id: string, filters?: string) =>
    ["syllabus", id, "materials", filters ?? "all"] as const,
  proposals: (id: string) => ["syllabus", id, "proposals"] as const,
  courseTree: (slug: string) => ["course", slug, "tree"] as const,
  roadmap: (slug: string) => ["course", slug, "roadmap"] as const,
  today: ["today"] as const,
  progress: ["progress"] as const,
};
