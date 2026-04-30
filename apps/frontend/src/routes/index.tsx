import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProjectRow } from "@wiki/frontend/modules/projects/components/project-row";
import { listProjects } from "@wiki/frontend/modules/projects/api";
import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";

export const Route = createFileRoute("/")({
  component: Dashboard
});

function Dashboard() {
  const projectsQuery = useQuery({ queryKey: projectQueryKeys.all, queryFn: listProjects });
  const projects = projectsQuery.data ?? [];
  const activeProjects = projects.filter((project) => !project.archived);
  const latestProjects = activeProjects.slice(0, 5);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="border-b pb-5">
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A compact overview of your local knowledge base.
          </p>
        </section>
        <section className="grid grid-cols-3 gap-3">
          <OverviewStat label="Total projects" value={projects.length} />
          <OverviewStat label="Active projects" value={activeProjects.length} />
          <OverviewStat label="Archived projects" value={projects.length - activeProjects.length} />
        </section>
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Recent projects</h3>
            <Link
              className="rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
              to="/projects"
            >
              Manage projects
            </Link>
          </div>
          {latestProjects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
          {projectsQuery.isLoading ? (
            <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              Loading overview...
            </p>
          ) : null}
          {projectsQuery.data?.length === 0 ? (
            <div className="rounded-md border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                No projects yet. Create one from the Projects page.
              </p>
              <Link
                className="mt-3 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                to="/projects"
              >
                Create project
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function OverviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
