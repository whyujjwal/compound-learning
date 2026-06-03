export { getApiBase, request } from "./client";
export type { PaginationParams } from "./client";
export * from "./types";

import {
  authEndpoints,
  catalogEndpoints,
  curriculumEndpoints,
  insightsEndpoints,
  studyEndpoints,
  trackEndpoints,
  userEndpoints,
} from "./endpoints";

export const api = {
  ...userEndpoints,
  ...curriculumEndpoints,
  ...trackEndpoints,
  ...catalogEndpoints,
  ...studyEndpoints,
  ...insightsEndpoints,
  ...authEndpoints,
};
