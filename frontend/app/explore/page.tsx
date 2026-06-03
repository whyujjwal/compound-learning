import type { CatalogCollection, CatalogTrack } from "@/lib/api";
import { serverApiGet } from "@/lib/server-api";
import { ExploreClient } from "./ExploreClient";

type ExplorePageData = {
  tracks: CatalogTrack[];
  collections: CatalogCollection[];
};

const EMPTY: ExplorePageData = {
  tracks: [],
  collections: [],
};

export default async function ExplorePage() {
  let data = EMPTY;
  try {
    data = await serverApiGet<ExplorePageData>("/catalog/explore");
  } catch {
    // Fall back to empty catalog — client actions still work after adopt/star.
  }

  return (
    <ExploreClient
      initialTracks={data.tracks}
      initialCollections={data.collections}
    />
  );
}
