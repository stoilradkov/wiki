import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId/documents")({
  component: DocumentsLayout
});

function DocumentsLayout() {
  return <Outlet />;
}
