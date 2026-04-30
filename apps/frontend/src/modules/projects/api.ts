import type {
  CreateProjectRequest,
  ListProjectsResponse,
  Project,
  UpdateProjectRequest
} from "@wiki/shared";
import { api } from "@wiki/frontend/lib/http";

export async function listProjects(): Promise<Project[]> {
  const response = await api.get<ListProjectsResponse>("/projects");
  return response.data.projects;
}

export async function createProject(input: CreateProjectRequest): Promise<Project> {
  const response = await api.post<Project>("/projects", input);
  return response.data;
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectRequest
): Promise<Project> {
  const response = await api.patch<Project>(`/projects/${projectId}`, input);
  return response.data;
}
