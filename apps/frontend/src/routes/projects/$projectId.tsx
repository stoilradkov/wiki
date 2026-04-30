import { createFileRoute } from "@tanstack/react-router";
import { Link, Outlet, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { BookOpenText, Bot, GitBranch, Search, Settings } from "lucide-react";
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

  return (
    <main className="flex-1 overflow-y-auto">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold">{project?.name ?? "Project"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {project?.description ?? "Loading project details"}
            </p>
          </div>
          <nav className="flex gap-1">
            <WorkspaceLink
              icon={<BookOpenText className="size-4" />}
              label="Documents"
              to="/projects/$projectId/documents"
            />
            <WorkspaceLink
              icon={<Search className="size-4" />}
              label="Search"
              to="/projects/$projectId/search"
            />
            <WorkspaceLink
              icon={<Bot className="size-4" />}
              label="Chat"
              to="/projects/$projectId/chat"
            />
            <WorkspaceLink
              icon={<GitBranch className="size-4" />}
              label="Graph"
              to="/projects/$projectId/graph"
            />
            <WorkspaceLink
              icon={<Settings className="size-4" />}
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
      activeProps={{ className: "bg-accent text-accent-foreground" }}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
      params={{ projectId }}
      to={to}
    >
      {icon}
      {label}
    </Link>
  );
}
