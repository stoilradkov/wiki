import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";

export const chatQueryKeys = {
  threads: (projectId: string) => [...projectQueryKeys.detail(projectId), "chat", "threads"],
  thread: (projectId: string, threadId: string | null) => [
    ...projectQueryKeys.detail(projectId),
    "chat",
    "threads",
    threadId
  ]
};
