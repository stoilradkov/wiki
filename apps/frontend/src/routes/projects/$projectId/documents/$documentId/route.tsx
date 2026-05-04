import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ArrowLeft } from "lucide-react";
import { Button } from "@wiki/frontend/components/ui/button";
import { Separator } from "@wiki/frontend/components/ui/separator";
import { SkeletonBlock, PageError } from "@wiki/frontend/components/interaction";
import { getDocument } from "@wiki/frontend/modules/documents/api";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";
import { DocumentStatusBadge } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-status-badge";
import { PipelineStageBar } from "@wiki/frontend/routes/projects/$projectId/documents/-components/pipeline-stage-bar";

export const Route = createFileRoute("/projects/$projectId/documents/$documentId")({
  component: DocumentDetailView
});

function DocumentDetailView() {
  const { projectId, documentId } = useParams({
    from: "/projects/$projectId/documents/$documentId"
  });
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
    <section className="content-panel grid gap-5">
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
      <Separator />
      <div className="grid gap-3">
        <h4 className="text-ui font-medium text-foreground">Source</h4>
        <div className="grid gap-2 text-caption text-muted-foreground">
          <span>{document.sourceMetadata.title ?? "No source title"}</span>
          <span>{document.sourceMetadata.author ?? "No author"}</span>
          <span className="meta">{document.rawContentHash}</span>
        </div>
      </div>
      <Separator />
      <div className="grid gap-3">
        <h4 className="text-ui font-medium text-foreground">Raw text</h4>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border-[0.5px] border-border bg-surface-3 p-3.5 font-mono text-caption leading-relaxed text-foreground">
          {document.rawContent ?? "Raw content is not stored for this document."}
        </pre>
      </div>
    </section>
  );
}

function isNotFoundError(error: Error | null): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}
