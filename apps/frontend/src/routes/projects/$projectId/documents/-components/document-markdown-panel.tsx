import { useBlocker } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import type { DocumentDetail } from "@wiki/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@wiki/frontend/components/ui/alert-dialog";
import { Button } from "@wiki/frontend/components/ui/button";
import { Label } from "@wiki/frontend/components/ui/label";
import { Textarea } from "@wiki/frontend/components/ui/textarea";
import {
  FormErrorBanner,
  LoadingLabel,
  getErrorMessage
} from "@wiki/frontend/components/interaction";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";
import { updateDocumentMarkdown } from "@wiki/frontend/modules/documents/api";
import { MarkdownPreview } from "@wiki/frontend/routes/projects/$projectId/documents/-components/markdown-preview";
import { DocumentVersionHistory } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-version-history";

interface DocumentMarkdownPanelProps {
  document: DocumentDetail;
  projectId: string;
}

export function DocumentMarkdownPanel({ document, projectId }: DocumentMarkdownPanelProps) {
  const queryClient = useQueryClient();
  const savedMarkdown = document.currentMarkdownVersion?.markdown ?? "";
  const [draftMarkdown, setDraftMarkdown] = useState(savedMarkdown);
  const isDirty = draftMarkdown !== savedMarkdown;
  const isProceedingRef = useRef(false);
  const blocker = useBlocker({
    disabled: !isDirty,
    enableBeforeUnload: isDirty,
    shouldBlockFn: () => isDirty,
    withResolver: true
  });
  const saveMarkdownMutation = useMutation({
    mutationFn: () =>
      updateDocumentMarkdown(projectId, document.id, {
        markdown: draftMarkdown
      }),
    onSuccess: (updatedDocument) => {
      queryClient.setQueryData(documentQueryKeys.detail(projectId, document.id), updatedDocument);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: documentQueryKeys.all(projectId) });
      await queryClient.invalidateQueries({
        queryKey: documentQueryKeys.versions(projectId, document.id)
      });
    }
  });
  const versionLabel = useMemo(() => {
    if (!document.currentMarkdownVersion) return "No version";
    return `v${document.currentMarkdownVersion.versionNumber} / ${document.currentMarkdownVersion.author}`;
  }, [document.currentMarkdownVersion]);

  useEffect(() => {
    setDraftMarkdown(savedMarkdown);
  }, [savedMarkdown]);

  useEffect(() => {
    if (blocker.status === "idle") isProceedingRef.current = false;
  }, [blocker.status]);

  function resetBlockedNavigation() {
    if (blocker.status === "blocked") blocker.reset();
  }

  function proceedBlockedNavigation() {
    if (blocker.status !== "blocked") return;
    isProceedingRef.current = true;
    blocker.proceed();
  }

  return (
    <>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-ui font-medium text-foreground">Markdown</h4>
            <p className="meta">{versionLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty ? (
              <span className="rounded-full bg-(--amber-dim) px-2.5 py-0.75 text-badge font-medium text-amber">
                Unsaved edits
              </span>
            ) : null}
            <Button
              disabled={!isDirty || saveMarkdownMutation.isPending}
              onClick={() => setDraftMarkdown(savedMarkdown)}
              title={!isDirty ? "No edits to reset" : "Reset unsaved markdown edits"}
              type="button"
              variant="ghost"
            >
              <RotateCcw className="size-3.75" />
              Reset
            </Button>
            <Button
              aria-busy={saveMarkdownMutation.isPending}
              disabled={
                !isDirty || saveMarkdownMutation.isPending || draftMarkdown.trim().length === 0
              }
              onClick={() => saveMarkdownMutation.mutate()}
              title={!isDirty ? "No edits to save" : "Save markdown as a new version"}
              type="button"
            >
              {saveMarkdownMutation.isPending ? (
                <LoadingLabel>Saving...</LoadingLabel>
              ) : (
                <>
                  <Save className="size-3.75" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
        <FormErrorBanner>
          {saveMarkdownMutation.isError
            ? getErrorMessage(saveMarkdownMutation.error, "Could not save markdown. Try again.")
            : null}
        </FormErrorBanner>
        <div className="grid grid-cols-2 items-start gap-3 max-[900px]:grid-cols-1">
          <div className="grid gap-2">
            <Label htmlFor="document-markdown-editor">Editor</Label>
            <Textarea
              className="min-h-[68vh] resize-y font-mono text-caption leading-relaxed"
              id="document-markdown-editor"
              onChange={(event) => setDraftMarkdown(event.target.value)}
              value={draftMarkdown}
            />
          </div>
          <div className="grid gap-2">
            <div className="text-ui font-medium text-foreground">Preview</div>
            <div className="min-h-[68vh] overflow-auto rounded-md border-[0.5px] border-border bg-surface-2 p-3.5">
              {draftMarkdown.trim().length > 0 ? (
                <MarkdownPreview markdown={draftMarkdown} />
              ) : (
                <p className="text-ui text-muted-foreground">Markdown preview appears here.</p>
              )}
            </div>
          </div>
        </div>
        <DocumentVersionHistory document={document} projectId={projectId} />
      </div>
      <AlertDialog
        onOpenChange={(open) => {
          if (open) return;
          if (isProceedingRef.current) return;
          resetBlockedNavigation();
        }}
        open={blocker.status === "blocked"}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved edits?</AlertDialogTitle>
            <AlertDialogDescription>
              Your markdown changes have not been saved. Leaving now will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetBlockedNavigation}>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={proceedBlockedNavigation} variant="danger">
              Discard edits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
