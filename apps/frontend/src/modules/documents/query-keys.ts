import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";

export const documentQueryKeys = {
  all: (projectId: string) => [...projectQueryKeys.detail(projectId), "documents"] as const,
  detail: (projectId: string, documentId: string) =>
    [...documentQueryKeys.all(projectId), documentId] as const,
  chunks: (projectId: string, documentId: string, markdownVersionId: string | null) =>
    [...documentQueryKeys.detail(projectId, documentId), "chunks", markdownVersionId ?? "none"] as const,
  versions: (projectId: string, documentId: string) =>
    [...documentQueryKeys.detail(projectId, documentId), "markdown-versions"] as const
};
