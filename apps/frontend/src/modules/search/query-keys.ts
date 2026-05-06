import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";
import type { SearchProjectRequest } from "@wiki/frontend/modules/search/api";

export const searchQueryKeys = {
  hybrid: (projectId: string, input: SearchProjectRequest | null) => [
    ...projectQueryKeys.detail(projectId),
    "search",
    "hybrid",
    input
  ]
};
