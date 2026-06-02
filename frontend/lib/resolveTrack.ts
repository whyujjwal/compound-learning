import type { Track } from "@/lib/api";

/** Match a ?track= query param to a track id (accepts uuid or slug). */
export function resolveTrackParam(tracks: Track[], param: string | null | undefined): string {
  if (!param) return "";
  if (tracks.some((t) => t.id === param)) return param;
  return tracks.find((t) => t.slug === param)?.id ?? "";
}
