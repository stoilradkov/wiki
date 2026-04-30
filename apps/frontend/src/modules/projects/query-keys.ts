export const projectQueryKeys = {
  all: ["projects"] as const,
  detail: (projectId: string) => [...projectQueryKeys.all, projectId] as const
};
