import { api } from "@wiki/frontend/lib/api";
import type { HybridSearchResponse } from "@wiki/shared";

export async function searchProject(
  projectId: string,
  query: string
): Promise<HybridSearchResponse> {
  const response = await api.post<HybridSearchResponse>(`/projects/${projectId}/search`, {
    query
  });

  return response.data;
}
