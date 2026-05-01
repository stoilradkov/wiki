import { createRootRoute } from "@tanstack/react-router";
import { Link, Outlet } from "@tanstack/react-router";
import { Home, Plus, Search, Circle, FileText, SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { packageName } from "@wiki/shared";
import { listProjects } from "@wiki/frontend/modules/projects/api";
import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";
import { Button } from "@wiki/frontend/components/ui/button";
import { Input } from "@wiki/frontend/components/ui/input";
import { SectionError, SkeletonBlock } from "@wiki/frontend/components/interaction";

export const Route = createRootRoute({
  component: RootLayout
});

function RootLayout() {
  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.all,
    queryFn: listProjects
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="border-b-[0.5px] border-border px-4 py-4">
          <p className="eyebrow sidebar-heading">{packageName}</p>
          <h1 className="sidebar-heading mt-1 font-serif text-brand leading-none text-foreground">
            Knowledge
          </h1>
          <label className="sidebar-search mt-4 flex items-center gap-2 rounded-md border-[0.5px] border-(--border-em) bg-surface-3 px-3 py-2 text-muted-foreground">
            <Search className="size-3.25" />
            <span className="text-caption text-faint">Search</span>
            <Input
              aria-label="Search knowledge"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-caption shadow-none"
              type="search"
            />
          </label>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <Link activeProps={{ className: "nav-row-active" }} className="nav-row mb-2" to="/">
            <Home className="size-3.25" />
            <span className="sidebar-label">Dashboard</span>
          </Link>
          <Link
            activeProps={{ className: "nav-row-active" }}
            className="nav-row mb-2"
            to="/projects"
          >
            <FileText className="size-3.25" />
            <span className="sidebar-label">Projects</span>
          </Link>
          <Link activeProps={{ className: "nav-row-active" }} className="nav-row mb-2" to="/settings">
            <SlidersHorizontal className="size-3.25" />
            <span className="sidebar-label">Settings</span>
          </Link>
          <div className="eyebrow sidebar-label mt-6 px-2">Active projects</div>
          <div
            aria-busy={projectsQuery.isLoading}
            className="mt-2 grid gap-1 border-t-[0.5px] border-border pt-3"
          >
            {projectsQuery.isLoading ? (
              <>
                <SkeletonBlock className="h-7" />
                <SkeletonBlock className="h-7" />
                <SkeletonBlock className="h-7" />
              </>
            ) : null}
            {projectsQuery.isError ? (
              <SectionError
                message="Projects failed"
                onRetry={() => void projectsQuery.refetch()}
              />
            ) : null}
            {(projectsQuery.data ?? []).map((project) => (
              <Link
                activeProps={{ className: "nav-row-active" }}
                className="nav-row"
                key={project.id}
                params={{ projectId: project.id }}
                to="/projects/$projectId/documents"
              >
                <Circle className="size-1.75 fill-current" style={{ color: project.color }} />
                <span className="sidebar-label truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        </nav>
        <div className="sidebar-footer border-t-[0.5px] border-border p-3">
          <Button asChild className="w-full" size="sm">
            <Link to="/projects">
              <Plus className="size-3.25" />
              New project
            </Link>
          </Button>
        </div>
      </aside>
      <Outlet />
    </div>
  );
}
