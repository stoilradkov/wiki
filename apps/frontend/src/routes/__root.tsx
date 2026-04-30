import { createRootRoute } from "@tanstack/react-router";
import { Link, Outlet } from "@tanstack/react-router";
import { BookOpenText, Circle, LayoutDashboard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { packageName } from "@wiki/shared";
import { listProjects } from "@wiki/frontend/modules/projects/api";
import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";

export const Route = createRootRoute({
  component: RootLayout
});

function RootLayout() {
  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.all,
    queryFn: listProjects
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-72 shrink-0 flex-col border-r bg-card">
        <div className="border-b px-5 py-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">{packageName}</p>
          <h1 className="mt-1 text-xl font-semibold">Knowledge workspace</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <Link
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            to="/"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
          <Link
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            to="/projects"
          >
            <BookOpenText className="size-4" />
            Projects
          </Link>
          <div className="mt-4 px-3 text-xs font-semibold uppercase text-muted-foreground">
            Active projects
          </div>
          <div className="mt-2 grid gap-1">
            {(projectsQuery.data ?? []).map((project) => (
              <Link
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                key={project.id}
                params={{ projectId: project.id }}
                to="/projects/$projectId/documents"
              >
                <Circle className="size-3 fill-current" style={{ color: project.color }} />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>
      <Outlet />
    </div>
  );
}
