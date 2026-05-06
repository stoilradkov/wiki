import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@wiki/frontend/components/ui/button";
import { SkeletonBlock, PageError } from "@wiki/frontend/components/interaction";
import { getDocument } from "@wiki/frontend/modules/documents/api";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";
import { DocumentStatusBadge } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-status-badge";
import { DocumentDetailTabs } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-detail-tabs";
import { DocumentPipelineStatusPanel } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-pipeline-status-panel";
import { PipelineStageBar } from "@wiki/frontend/routes/projects/$projectId/documents/-components/pipeline-stage-bar";

export const Route = createFileRoute("/projects/$projectId/documents/$documentId")({
  validateSearch: z.object({
    citationChunkId: z.string().uuid().optional()
  }),
  component: DocumentDetailView
});

function DocumentDetailView() {
  const { projectId, documentId } = useParams({
    from: "/projects/$projectId/documents/$documentId"
  });
  const { citationChunkId } = Route.useSearch();
  const documentQuery = useQuery({
    queryKey: documentQueryKeys.detail(projectId, documentId),
    queryFn: () => getDocument(projectId, documentId)
  });

  if (documentQuery.isLoading) {
    return (
      <section className="content-panel grid gap-4">
        <SkeletonBlock className="h-8 w-1/2" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-72 w-full" />
      </section>
    );
  }

  if (isNotFoundError(documentQuery.error)) {
    return (
      <section className="content-panel grid place-items-center p-8 text-center">
        <div className="grid max-w-sm gap-3">
          <h3 className="section-title">This no longer exists</h3>
          <p className="text-ui text-muted-foreground">
            The document may have been removed or moved from this project.
          </p>
          <div className="mt-1 flex justify-center">
            <Button asChild variant="ghost">
              <Link params={{ projectId }} to="/projects/$projectId/documents">
                <ArrowLeft className="size-3.75" />
                Back to documents
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (documentQuery.isError || !documentQuery.data) {
    return (
      <PageError
        backAction={
          <Button asChild variant="ghost">
            <Link params={{ projectId }} to="/projects/$projectId/documents">
              <ArrowLeft className="size-3.75" />
              Back
            </Link>
          </Button>
        }
        message="Could not load this document"
        onRetry={() => void documentQuery.refetch()}
      />
    );
  }

  const document = documentQuery.data;

  return (
    <section className="content-panel grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button asChild className="mb-3" size="sm" variant="ghost">
            <Link params={{ projectId }} to="/projects/$projectId/documents">
              <ArrowLeft className="size-3.75" />
              Documents
            </Link>
          </Button>
          <h3 className="section-title truncate">{document.title ?? "Untitled document"}</h3>
          <p className="meta mt-1">
            {document.pipelineStage ?? "no stage"} / {new Date(document.createdAt).toLocaleString()}
          </p>
        </div>
        <DocumentStatusBadge status={document.status} />
      </div>
      {document.pipelineStage ? <PipelineStageBar stage={document.pipelineStage} /> : null}
      <DocumentPipelineStatusPanel document={document} projectId={projectId} />
      <DocumentDetailTabs
        citationChunkId={citationChunkId}
        document={document}
        projectId={projectId}
      />
    </section>
  );
}

function isNotFoundError(error: Error | null): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}
