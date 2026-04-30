import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import type { SourceMetadata } from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import { updateDocumentMetadata } from "@wiki/frontend/modules/documents/api";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";

type DocumentRowDocument = {
  id: string;
  title: string | null;
  status: string;
  pipelineStage: string | null;
  sourceMetadata: SourceMetadata;
  createdAt: string;
};

export function DocumentRow({
  document,
  projectId
}: {
  document: DocumentRowDocument;
  projectId: string;
}) {
  const queryClient = useQueryClient();
  const metadataMutation = useMutation({
    mutationFn: (input: { title: string | null; sourceMetadata: SourceMetadata }) =>
      updateDocumentMetadata(projectId, document.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.all(projectId) })
  });

  function handleMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    metadataMutation.mutate({
      title: optionalField(form, "title") ?? null,
      sourceMetadata: {
        url: optionalField(form, "sourceUrl"),
        title: optionalField(form, "sourceTitle"),
        author: optionalField(form, "sourceAuthor"),
        sourceDate: optionalField(form, "sourceDate"),
        note: optionalField(form, "sourceNote")
      }
    });
  }

  return (
    <article className="grid gap-3 rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold">{document.title ?? "Untitled document"}</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {document.status} / {document.pipelineStage ?? "no stage"} /{" "}
            {new Date(document.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
          {document.sourceMetadata.title ?? "No source title"}
        </span>
      </div>
      <form className="grid grid-cols-6 gap-2" onSubmit={handleMetadata}>
        <input
          className="rounded-md border bg-background px-2 py-1.5 text-xs"
          defaultValue={document.title ?? ""}
          name="title"
          placeholder="Title"
        />
        <input
          className="rounded-md border bg-background px-2 py-1.5 text-xs"
          defaultValue={document.sourceMetadata.url ?? ""}
          name="sourceUrl"
          placeholder="URL"
          type="url"
        />
        <input
          className="rounded-md border bg-background px-2 py-1.5 text-xs"
          defaultValue={document.sourceMetadata.title ?? ""}
          name="sourceTitle"
          placeholder="Source title"
        />
        <input
          className="rounded-md border bg-background px-2 py-1.5 text-xs"
          defaultValue={document.sourceMetadata.author ?? ""}
          name="sourceAuthor"
          placeholder="Author"
        />
        <input
          className="rounded-md border bg-background px-2 py-1.5 text-xs"
          defaultValue={document.sourceMetadata.sourceDate ?? ""}
          name="sourceDate"
          type="date"
        />
        <Button disabled={metadataMutation.isPending} size="sm" type="submit">
          Save metadata
        </Button>
        <input
          className="col-span-6 rounded-md border bg-background px-2 py-1.5 text-xs"
          defaultValue={document.sourceMetadata.note ?? ""}
          name="sourceNote"
          placeholder="Source note"
        />
      </form>
    </article>
  );
}

function optionalField(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  return value.length > 0 ? value : undefined;
}
