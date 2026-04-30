import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { FolderPlus, RefreshCw } from "lucide-react";
import type { FormEvent } from "react";
import type { CreateProjectRequest } from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import { ProjectRow } from "@wiki/frontend/modules/projects/components/project-row";
import { createProject, listProjects } from "@wiki/frontend/modules/projects/api";
import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage
});

function ProjectsPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: projectQueryKeys.all, queryFn: listProjects });
  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      await navigate({ to: "/projects/$projectId/documents", params: { projectId: project.id } });
    }
  });

  function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: CreateProjectRequest = {
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      color: String(form.get("color") ?? "#1f6feb"),
      icon: String(form.get("icon") ?? "folder"),
      ingestionMode: "auto",
      extractionProfile: "general"
    };
    createProjectMutation.mutate(input);
  }

  if (pathname !== "/projects") {
    return <Outlet />;
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="grid gap-4 border-b pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Projects</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a workspace, then paste source text into its document queue.
              </p>
            </div>
            {projectsQuery.isFetching ? <RefreshCw className="size-4 animate-spin" /> : null}
          </div>
          <form
            className="grid grid-cols-[1.2fr_1.8fr_7rem_7rem_auto] gap-2"
            onSubmit={handleCreateProject}
          >
            <input
              className="rounded-md border bg-card px-3 py-2 text-sm"
              name="name"
              placeholder="Project name"
              required
            />
            <input
              className="rounded-md border bg-card px-3 py-2 text-sm"
              name="description"
              placeholder="Description"
            />
            <input
              className="h-10 rounded-md border bg-card px-2"
              name="color"
              type="color"
              defaultValue="#1f6feb"
            />
            <input
              className="rounded-md border bg-card px-3 py-2 text-sm"
              name="icon"
              defaultValue="folder"
            />
            <Button disabled={createProjectMutation.isPending} type="submit">
              <FolderPlus className="size-4" />
              Create
            </Button>
          </form>
        </section>
        <section className="grid gap-3">
          {(projectsQuery.data ?? []).map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
          {projectsQuery.data?.length === 0 ? (
            <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              No projects yet. Add the first one above.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
