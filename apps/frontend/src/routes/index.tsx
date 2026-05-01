import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PageError,
  ProjectGridSkeleton,
  SkeletonBlock
} from "@wiki/frontend/components/interaction";
import { Button } from "@wiki/frontend/components/ui/button";
import { listProjects } from "@wiki/frontend/modules/projects/api";
import { ProjectRow } from "@wiki/frontend/modules/projects/components/project-row";
import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";
import { FileText, FolderOpen, Network, Search } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard
});

function Dashboard() {
  const projectsQuery = useQuery({ queryKey: projectQueryKeys.all, queryFn: listProjects });
  const projects = projectsQuery.data ?? [];
  const activeProjects = projects.filter((project) => !project.archived);
  const latestProjects = activeProjects.slice(0, 5);

  return (
    <main className="flex-1 overflow-y-auto">
      <header className="topbar flex items-center justify-between">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="mt-1 text-ui text-muted-foreground">
            A compact overview of your local knowledge base.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link to="/projects">Manage projects</Link>
        </Button>
      </header>
      <div className="content-panel grid gap-6">
        <section className="grid grid-cols-4 gap-3 max-[1200px]:grid-cols-2">
          {projectsQuery.isLoading ? (
            <>
              <SkeletonBlock className="h-18" />
              <SkeletonBlock className="h-18" />
              <SkeletonBlock className="h-18" />
              <SkeletonBlock className="h-18" />
            </>
          ) : (
            <>
              <OverviewStat
                icon={<FolderOpen className="size-3.75" />}
                label="Total projects"
                value={projects.length}
              />
              <OverviewStat
                icon={<FileText className="size-3.75" />}
                label="Active projects"
                value={activeProjects.length}
              />
              <OverviewStat
                icon={<Network className="size-3.75" />}
                label="Graph nodes"
                value={0}
              />
              <OverviewStat
                icon={<Search className="size-3.75" />}
                label="Archived"
                value={projects.length - activeProjects.length}
              />
            </>
          )}
        </section>
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Recent projects</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 max-[1200px]:grid-cols-1">
            {latestProjects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
          {projectsQuery.isLoading ? <ProjectGridSkeleton count={4} /> : null}
          {projectsQuery.isError ? (
            <PageError
              message="Could not load dashboard"
              onRetry={() => void projectsQuery.refetch()}
            />
          ) : null}
          {projectsQuery.data?.length === 0 ? (
            <div className="empty-state">
              <div>
                <FolderOpen className="mx-auto size-10 text-faint" strokeWidth={1} />
                <h3 className="mt-4 font-serif text-display-sm italic text-muted-foreground">
                  Your knowledge starts here
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-ui font-light text-faint">
                  Create a project to collect raw notes, sources, and documents into one navigable
                  space.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/projects">Create first project</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function OverviewStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <span className="text-faint">{icon}</span>
      </div>
      <p className="mt-2 font-serif text-display-sm leading-none text-foreground">{value}</p>
    </div>
  );
}
