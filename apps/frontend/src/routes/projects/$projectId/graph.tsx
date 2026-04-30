import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId/graph")({
  component: GraphView
});

function GraphView() {
  return <PlaceholderView title="Graph" />;
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <section className="p-6">
      <div className="rounded-md border bg-card p-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This Phase 1 shell keeps the workspace route ready for the next phase.
        </p>
      </div>
    </section>
  );
}
