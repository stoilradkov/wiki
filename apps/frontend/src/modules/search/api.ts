import { api } from "@wiki/frontend/lib/api";
import type { HybridSearchRequest, HybridSearchResponse } from "@wiki/shared";

export type SearchProjectRequest = Omit<HybridSearchRequest, "projectIds">;

export async function searchProject(
  projectId: string,
  input: SearchProjectRequest
): Promise<HybridSearchResponse> {
  const response = await api.post<HybridSearchResponse>(`/projects/${projectId}/search`, input);

  return response.data;
}
