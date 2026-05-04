import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";

export const documentQueryKeys = {
  all: (projectId: string) => [...projectQueryKeys.detail(projectId), "documents"] as const,
  detail: (projectId: string, documentId: string) =>
    [...documentQueryKeys.all(projectId), documentId] as const,
  versions: (projectId: string, documentId: string) =>
    [...documentQueryKeys.detail(projectId, documentId), "markdown-versions"] as const
};
