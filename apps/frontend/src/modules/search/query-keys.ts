import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";

export const searchQueryKeys = {
  hybrid: (projectId: string, query: string) =>
    [...projectQueryKeys.detail(projectId), "search", "hybrid", query]
};
