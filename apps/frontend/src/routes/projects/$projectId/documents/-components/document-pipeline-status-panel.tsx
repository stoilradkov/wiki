import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, GitFork, MessageSquare, RefreshCw, Search } from "lucide-react";
import type { DocumentDetail } from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import {
  FormErrorBanner,
  LoadingLabel,
  getErrorMessage
} from "@wiki/frontend/components/interaction";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";
import { retryDocumentIngestion } from "@wiki/frontend/modules/documents/api";

interface DocumentPipelineStatusPanelProps {
  document: DocumentDetail;
  projectId: string;
}

export function DocumentPipelineStatusPanel({
  document,
  projectId
}: DocumentPipelineStatusPanelProps) {
  const queryClient = useQueryClient();
  const retryMutation = useMutation({
    mutationFn: () => retryDocumentIngestion(projectId, document.id),
    onSuccess: (updatedDocument) => {
      queryClient.setQueryData(documentQueryKeys.detail(projectId, document.id), updatedDocument);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.all(projectId) })
  });

  if (document.status === "failed") {
    const retryAvailable = document.rawContentStored || Boolean(document.currentMarkdownVersion);
    const isQuotaFailure = document.errorCode === "quota_exceeded";
    const retryTitle = isQuotaFailure
      ? "Retry ingestion later when quota pressure eases"
      : "Retry ingestion";
    const retryLabel = isQuotaFailure ? "Retry later" : "Retry";

    return (
      <div className="grid gap-3 rounded-md border-[0.5px] border-coral bg-(--coral-dim) p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="flex items-center gap-2 text-ui font-medium text-foreground">
              <AlertCircle className="size-3.75 text-coral" />
              Ingestion failed
            </h4>
            <p className="mt-1 text-ui text-foreground">
              {document.errorMessage ?? "Ingestion failed. Retry when the issue is resolved."}
            </p>
            <p className="meta mt-1">
              code: {document.errorCode ?? "unknown_error"} / stage:{" "}
              {document.pipelineStage ?? "unknown"}
            </p>
          </div>
          <Button
            aria-busy={retryMutation.isPending}
            disabled={!retryAvailable || retryMutation.isPending}
            onClick={() => retryMutation.mutate()}
            title={retryAvailable ? retryTitle : "No source or markdown version to retry"}
            type="button"
            variant="danger"
          >
            {retryMutation.isPending ? (
              <LoadingLabel>Retrying...</LoadingLabel>
            ) : (
              <>
                <RefreshCw className="size-3.75" />
                {retryLabel}
              </>
            )}
          </Button>
        </div>
        <FormErrorBanner>
          {retryMutation.isError
            ? getErrorMessage(
                retryMutation.error,
                "Could not retry ingestion. Try again when the service is available."
              )
            : null}
        </FormErrorBanner>
      </div>
    );
  }

  if (document.status === "awaiting_review") {
    return (
      <div className="rounded-md border-[0.5px] border-blue bg-blue-dim p-3.5">
        <h4 className="text-ui font-medium text-foreground">Awaiting review</h4>
        <p className="text-ui text-muted-foreground">
          Review the Markdown tab, then approve to continue from chunking.
        </p>
      </div>
    );
  }

  if (document.status === "ready") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-[0.5px] border-border bg-surface-2 p-3.5">
        <div>
          <h4 className="flex items-center gap-2 text-ui font-medium text-foreground">
            <CheckCircle2 className="size-3.75 text-accent" />
            Ready
          </h4>
          <p className="text-ui text-muted-foreground">
            This document can participate in search, chat, and graph views.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link params={{ projectId }} to="/projects/$projectId/search">
              <Search className="size-3.75" />
              Search
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link params={{ projectId }} to="/projects/$projectId/chat">
              <MessageSquare className="size-3.75" />
              Chat
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link params={{ projectId }} to="/projects/$projectId/graph">
              <GitFork className="size-3.75" />
              Graph
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
