import { createFileRoute } from "@tanstack/react-router";
import { Link, Outlet, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { Bot, Circle, FileText, Network, Search, Settings } from "lucide-react";
import { Button } from "@wiki/frontend/components/ui/button";
import { PageError, SkeletonBlock } from "@wiki/frontend/components/interaction";
import { listProjects } from "@wiki/frontend/modules/projects/api";
import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectLayout
});

function ProjectLayout() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const projectsQuery = useQuery({ queryKey: projectQueryKeys.all, queryFn: listProjects });
  const project = useMemo(
    () => projectsQuery.data?.find((candidate) => candidate.id === projectId),
    [projectId, projectsQuery.data]
  );

  if (projectsQuery.isError) {
    return (
      <main className="flex-1 overflow-y-auto">
        <section className="content-panel">
          <PageError
            backAction={
              <Button asChild variant="ghost">
                <Link to="/projects">Go back to projects</Link>
              </Button>
            }
            message="Could not load this project"
            onRetry={() => void projectsQuery.refetch()}
          />
        </section>
      </main>
    );
  }

  if (!projectsQuery.isLoading && !project) {
    return (
      <main className="flex-1 overflow-y-auto">
        <section className="content-panel">
          <div className="empty-state">
            <div>
            <h3 className="font-serif text-display-sm italic text-muted-foreground">
                This project no longer exists
              </h3>
              <Button asChild className="mt-4" variant="ghost">
                <Link to="/projects">Back to projects</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <header className="topbar">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {project ? (
                <Circle className="size-1.75 fill-current" style={{ color: project.color }} />
              ) : null}
              <h2 className="page-title truncate">{project?.name ?? "Project"}</h2>
            </div>
            <div className="mt-1 text-ui text-muted-foreground">
              {projectsQuery.isLoading ? (
                <SkeletonBlock className="h-3 w-56" />
              ) : (
                project?.description
              )}
            </div>
          </div>
          <nav className="flex gap-1">
            <WorkspaceLink
              icon={<FileText className="size-3.75" />}
              label="Documents"
              to="/projects/$projectId/documents"
            />
            <WorkspaceLink
              icon={<Search className="size-3.75" />}
              label="Search"
              to="/projects/$projectId/search"
            />
            <WorkspaceLink
              icon={<Bot className="size-3.75" />}
              label="Chat"
              to="/projects/$projectId/chat"
            />
            <WorkspaceLink
              icon={<Network className="size-3.75" />}
              label="Graph"
              to="/projects/$projectId/graph"
            />
            <WorkspaceLink
              icon={<Settings className="size-3.75" />}
              label="Settings"
              to="/projects/$projectId/settings"
            />
          </nav>
        </div>
      </header>
      <Outlet />
    </main>
  );
}

function WorkspaceLink({
  icon,
  label,
  to
}: {
  icon: ReactNode;
  label: string;
  to:
    | "/projects/$projectId/documents"
    | "/projects/$projectId/search"
    | "/projects/$projectId/chat"
    | "/projects/$projectId/graph"
    | "/projects/$projectId/settings";
}) {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  return (
    <Link
      activeProps={{ className: "nav-row-active" }}
      className="nav-row"
      params={{ projectId }}
      to={to}
    >
      {icon}
      {label}
    </Link>
  );
}
