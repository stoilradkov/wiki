import { api } from "@wiki/frontend/lib/api";
import type {
  ChatThread,
  ChatThreadDetail,
  CreateChatMessageRequest,
  CreateChatMessageResponse,
  CreateChatThreadRequest,
  ListChatThreadsResponse
} from "@wiki/shared";

export async function listChatThreads(projectId: string): Promise<ChatThread[]> {
  const response = await api.get<ListChatThreadsResponse>(`/projects/${projectId}/chat/threads`);
  return response.data.threads;
}

export async function createChatThread(
  projectId: string,
  input: CreateChatThreadRequest
): Promise<ChatThreadDetail> {
  const response = await api.post<ChatThreadDetail>(`/projects/${projectId}/chat/threads`, input);
  return response.data;
}

export async function getChatThread(
  projectId: string,
  threadId: string
): Promise<ChatThreadDetail> {
  const response = await api.get<ChatThreadDetail>(
    `/projects/${projectId}/chat/threads/${threadId}`
  );
  return response.data;
}

export async function createChatMessage(
  projectId: string,
  threadId: string,
  input: CreateChatMessageRequest
): Promise<CreateChatMessageResponse> {
  const response = await api.post<CreateChatMessageResponse>(
    `/projects/${projectId}/chat/threads/${threadId}/messages`,
    input
  );
  return response.data;
}
