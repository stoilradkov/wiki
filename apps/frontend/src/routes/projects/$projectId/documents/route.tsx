import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { useProjectIngestionStream } from "@wiki/frontend/modules/documents/use-project-ingestion-stream";

export const Route = createFileRoute("/projects/$projectId/documents")({
  component: DocumentsLayout
});

function DocumentsLayout() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  useProjectIngestionStream(projectId);

  return <Outlet />;
}
