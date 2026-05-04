import { Link } from "@tanstack/react-router";
import type { Document } from "@wiki/shared";
import { AlertTriangle, ExternalLink, FilePlus2 } from "lucide-react";
import { Button } from "@wiki/frontend/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@wiki/frontend/components/ui/dialog";
import { LoadingLabel } from "@wiki/frontend/components/interaction";

export function DuplicateDocumentDialog({
  duplicate,
  open,
  projectId,
  creating,
  onCancel,
  onCreateAnyway
}: {
  duplicate: Document | null;
  open: boolean;
  projectId: string;
  creating: boolean;
  onCancel: () => void;
  onCreateAnyway: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber">
            <AlertTriangle className="size-3.75" strokeWidth={1.5} />
            <DialogTitle>Exact duplicate found</DialogTitle>
          </div>
        </DialogHeader>
        <div className="grid gap-3 text-ui text-muted-foreground">
          <p>
            This paste matches an existing document in this project. You can review that document or
            queue this content anyway.
          </p>
          {duplicate ? (
            <div className="rounded-md border-[0.5px] border-(--border-em) bg-surface-3 p-3">
              <p className="truncate text-ui font-medium text-foreground">
                {duplicate.title ?? "Untitled document"}
              </p>
              <p className="meta mt-1">
                {duplicate.pipelineStage ?? "no stage"} /{" "}
                {new Date(duplicate.createdAt).toLocaleString()}
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {duplicate ? (
            <Button asChild variant="ghost">
              <Link
                params={{ documentId: duplicate.id, projectId }}
                to="/projects/$projectId/documents/$documentId"
              >
                <ExternalLink className="size-3.75" />
                Open existing
              </Link>
            </Button>
          ) : null}
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
          <Button aria-busy={creating} disabled={creating} onClick={onCreateAnyway} type="button">
            {creating ? (
              <LoadingLabel>Queueing...</LoadingLabel>
            ) : (
              <>
                <FilePlus2 className="size-3.75" />
                Create anyway
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
