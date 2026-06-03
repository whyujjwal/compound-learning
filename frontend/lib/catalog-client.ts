import type { CatalogTrack } from "./api";

export type CatalogSortMode = "ranking" | "stars" | "new";

export function filterCatalogTracks(
  tracks: CatalogTrack[],
  opts: { q?: string; featuredOnly?: boolean; sort: CatalogSortMode; limit?: number }
): CatalogTrack[] {
  let list = [...tracks];
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    list = list.filter((track) => {
      const haystack = [
        track.name,
        track.description ?? "",
        track.syllabus_summary ?? "",
        track.difficulty ?? "",
        track.target_audience ?? "",
        ...(track.learning_outcomes ?? []),
        ...(track.syllabus_preview ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }
  if (opts.featuredOnly) {
    list = list.filter((track) => track.is_featured);
  }

  list.sort((a, b) => {
    if (opts.sort === "stars") {
      return b.star_count - a.star_count || b.created_at.localeCompare(a.created_at);
    }
    if (opts.sort === "new") {
      return b.created_at.localeCompare(a.created_at);
    }
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    if (b.rank_score !== a.rank_score) return b.rank_score - a.rank_score;
    if (b.quality_score !== a.quality_score) return b.quality_score - a.quality_score;
    if (b.star_count !== a.star_count) return b.star_count - a.star_count;
    return b.adoption_count - a.adoption_count;
  });

  const limit = opts.limit ?? 80;
  return list.slice(0, limit);
}
