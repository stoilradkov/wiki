import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { DocumentDetail } from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import { Input } from "@wiki/frontend/components/ui/input";
import { Label } from "@wiki/frontend/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@wiki/frontend/components/ui/tooltip";
import {
  FieldError,
  FormErrorBanner,
  LoadingLabel,
  getErrorMessage
} from "@wiki/frontend/components/interaction";
import {
  approveDocumentReview,
  rerunDocumentMarkdownify,
  updateDocumentMetadata
} from "@wiki/frontend/modules/documents/api";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";

interface DocumentReviewActionsProps {
  document: DocumentDetail;
  markdownDirty: boolean;
  projectId: string;
}

export function DocumentReviewActions({
  document,
  markdownDirty,
  projectId
}: DocumentReviewActionsProps) {
  const queryClient = useQueryClient();
  const savedTitle = document.title ?? "";
  const [draftTitle, setDraftTitle] = useState(savedTitle);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleDirty = draftTitle !== savedTitle;
  const canRerunMarkdownify = document.rawContentStored;

  const titleMutation = useMutation({
    mutationFn: (title: string | null) =>
      updateDocumentMetadata(projectId, document.id, {
        title,
        sourceMetadata: document.sourceMetadata
      }),
    onSuccess: (updatedDocument) => {
      setTitleError(null);
      queryClient.setQueryData(documentQueryKeys.detail(projectId, document.id), updatedDocument);
    },
    onError: () => {
      setDraftTitle(savedTitle);
      setTitleError("Title reverted - could not save. Try again.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.all(projectId) })
  });

  const approveMutation = useMutation({
    mutationFn: () => approveDocumentReview(projectId, document.id),
    onSuccess: (updatedDocument) => {
      queryClient.setQueryData(documentQueryKeys.detail(projectId, document.id), updatedDocument);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.all(projectId) })
  });

  const rerunMutation = useMutation({
    mutationFn: () => rerunDocumentMarkdownify(projectId, document.id),
    onSuccess: (updatedDocument) => {
      queryClient.setQueryData(documentQueryKeys.detail(projectId, document.id), updatedDocument);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.all(projectId) })
  });

  useEffect(() => {
    setDraftTitle(savedTitle);
  }, [savedTitle]);

  if (document.status !== "awaiting_review") {
    return null;
  }

  function saveTitle() {
    const title = draftTitle.trim();
    if (!titleDirty || titleMutation.isPending) return;
    titleMutation.mutate(title.length > 0 ? title : null);
  }

  const actionDisabled =
    markdownDirty ||
    titleDirty ||
    titleMutation.isPending ||
    approveMutation.isPending ||
    rerunMutation.isPending;
  const rerunTooltip = canRerunMarkdownify
    ? "Rerun markdownify from raw content"
    : "Raw content is not available";
  const approveTooltip =
    markdownDirty || titleDirty ? "Save review edits before approving" : "Approve";

  return (
    <div className="grid gap-3 rounded-md border-[0.5px] border-blue bg-blue-dim p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-ui font-medium text-foreground">Review needed</h4>
          <p className="text-caption text-muted-foreground">
            Review title and markdown, then approve to continue ingestion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  disabled={actionDisabled || !canRerunMarkdownify}
                  onClick={() => rerunMutation.mutate()}
                  type="button"
                  variant="ghost"
                >
                  {rerunMutation.isPending ? (
                    <LoadingLabel>Rerunning...</LoadingLabel>
                  ) : (
                    <>
                      <RefreshCw className="size-3.75" />
                      Rerun
                    </>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{rerunTooltip}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  aria-busy={approveMutation.isPending}
                  disabled={actionDisabled}
                  onClick={() => approveMutation.mutate()}
                  type="button"
                >
                  {approveMutation.isPending ? (
                    <LoadingLabel>Approving...</LoadingLabel>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.75" />
                      Approve
                    </>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{approveTooltip}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="grid max-w-xl gap-1.5">
        <Label htmlFor="review-document-title">Title</Label>
        <Input
          aria-describedby={titleError ? "review-document-title-error" : undefined}
          disabled={titleMutation.isPending}
          id="review-document-title"
          onBlur={saveTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDraftTitle(savedTitle);
              setTitleError(null);
              event.currentTarget.blur();
            }
            if (event.key === "Enter") {
              saveTitle();
              event.currentTarget.blur();
            }
          }}
          value={draftTitle}
        />
        <FieldError id="review-document-title-error">{titleError}</FieldError>
      </div>
      <FormErrorBanner>
        {approveMutation.isError
          ? getErrorMessage(approveMutation.error, "Could not approve review. Try again.")
          : rerunMutation.isError
            ? getErrorMessage(rerunMutation.error, "Could not rerun markdownify. Try again.")
            : null}
      </FormErrorBanner>
    </div>
  );
}
