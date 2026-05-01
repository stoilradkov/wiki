import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { FolderPlus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  extractionProfileSchema,
  ingestionModeSchema
} from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@wiki/frontend/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@wiki/frontend/components/ui/form";
import { Input } from "@wiki/frontend/components/ui/input";
import {
  FormErrorBanner,
  LoadingLabel,
  PageError,
  ProjectGridSkeleton,
  getErrorMessage
} from "@wiki/frontend/components/interaction";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const projectsQuery = useQuery({ queryKey: projectQueryKeys.all, queryFn: listProjects });
  const projectForm = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
      color: "#C8F060",
      description: "",
      extractionProfile: "general",
      icon: "folder",
      ingestionMode: "auto",
      name: ""
    }
  });
  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      projectForm.reset();
      setDialogOpen(false);
      await navigate({ to: "/projects/$projectId/documents", params: { projectId: project.id } });
    }
  });

  if (pathname !== "/projects") {
    return <Outlet />;
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <header className="topbar flex items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="mt-1 text-ui text-muted-foreground">
            Create a workspace, then paste source text into its document queue.
          </p>
        </div>
        {projectsQuery.isFetching ? (
          <RefreshCw className="size-3.75 animate-spin text-amber" />
        ) : null}
        <Button onClick={() => setDialogOpen(true)} type="button">
          <FolderPlus className="size-3.75" />
          New project
        </Button>
      </header>
      <div className="content-panel grid gap-6">
        <section>
          {projectsQuery.isLoading ? <ProjectGridSkeleton /> : null}
          {projectsQuery.isError ? (
            <PageError
              message="Could not load projects"
              onRetry={() => void projectsQuery.refetch()}
            />
          ) : null}
          {projectsQuery.data ? (
            <div className="grid grid-cols-2 gap-3 max-[1200px]:grid-cols-1">
              {projectsQuery.data.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </div>
          ) : null}
          {projectsQuery.data?.length === 0 ? (
            <div className="empty-state">
              <div>
                <FolderPlus className="mx-auto size-10 text-faint" strokeWidth={1} />
                <h3 className="mt-4 font-serif text-display-sm italic text-muted-foreground">
                  Your knowledge starts here
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-ui font-light text-faint">
                  Create a project to collect sources and documents.
                </p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)} type="button">
                  Create first project
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (projectForm.formState.isDirty) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (projectForm.formState.isDirty) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <Form {...projectForm}>
            <form
              className="mt-4 grid gap-3"
              onSubmit={projectForm.handleSubmit((values) => createProjectMutation.mutate(values))}
            >
              <FormErrorBanner>
                {createProjectMutation.isError
                  ? getErrorMessage(
                      createProjectMutation.error,
                      "Could not create project. Try again."
                    )
                  : null}
              </FormErrorBanner>
              <FormField
                control={projectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project name</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-[7rem_1fr] gap-3">
                <FormField
                  control={projectForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colour</FormLabel>
                      <FormControl>
                        <Input className="h-9.5 p-1" type="color" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={projectForm.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-1 flex justify-end gap-2">
                <Button
                  onClick={() => {
                    projectForm.reset();
                    setDialogOpen(false);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  aria-busy={createProjectMutation.isPending}
                  disabled={createProjectMutation.isPending}
                  type="submit"
                >
                  {createProjectMutation.isPending ? (
                    <LoadingLabel>Creating...</LoadingLabel>
                  ) : (
                    <>
                      <FolderPlus className="size-3.75" />
                      Create
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

const createProjectFormSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  description: z.string().trim().max(1_000),
  color: z.string().trim().min(1).max(32),
  icon: z.string().trim().min(1).max(48),
  ingestionMode: ingestionModeSchema,
  extractionProfile: extractionProfileSchema,
  customExtractionInstructions: z.string().trim().max(4_000).nullable().optional()
});

type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;
