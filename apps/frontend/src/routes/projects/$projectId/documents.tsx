import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { FilePlus2 } from "lucide-react";
import type { FormEvent } from "react";
import type { CreateDocumentRequest, SourceMetadata } from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import { createDocument, listDocuments } from "@wiki/frontend/modules/documents/api";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";
import { DocumentRow } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-row";

export const Route = createFileRoute("/projects/$projectId/documents")({
  component: DocumentsView
});

function DocumentsView() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const queryClient = useQueryClient();
  const documentsQuery = useQuery({
    queryKey: documentQueryKeys.all(projectId),
    queryFn: () => listDocuments(projectId)
  });
  const createDocumentMutation = useMutation({
    mutationFn: (input: CreateDocumentRequest) => createDocument(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.all(projectId) })
  });

  function handlePaste(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const metadata: SourceMetadata = {
      url: optionalField(form, "sourceUrl"),
      title: optionalField(form, "sourceTitle"),
      author: optionalField(form, "sourceAuthor"),
      sourceDate: optionalField(form, "sourceDate"),
      note: optionalField(form, "sourceNote")
    };

    createDocumentMutation.mutate(
      {
        title: optionalField(form, "title"),
        rawContent: String(form.get("rawContent") ?? ""),
        sourceMetadata: metadata
      },
      {
        onSuccess: () => event.currentTarget.reset()
      }
    );
  }

  return (
    <section className="grid gap-6 p-6">
      <form className="grid gap-3 border-b pb-6" onSubmit={handlePaste}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Paste document</h3>
          <Button disabled={createDocumentMutation.isPending} type="submit">
            <FilePlus2 className="size-4" />
            Queue
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="rounded-md border bg-card px-3 py-2 text-sm"
            name="title"
            placeholder="Optional title"
          />
          <input
            className="rounded-md border bg-card px-3 py-2 text-sm"
            name="sourceUrl"
            placeholder="Source URL"
            type="url"
          />
          <input
            className="rounded-md border bg-card px-3 py-2 text-sm"
            name="sourceTitle"
            placeholder="Source title"
          />
          <input
            className="rounded-md border bg-card px-3 py-2 text-sm"
            name="sourceAuthor"
            placeholder="Author or source name"
          />
          <input
            className="rounded-md border bg-card px-3 py-2 text-sm"
            name="sourceDate"
            type="date"
          />
          <input
            className="rounded-md border bg-card px-3 py-2 text-sm"
            name="sourceNote"
            placeholder="Source note"
          />
        </div>
        <textarea
          className="min-h-44 resize-y rounded-md border bg-card px-3 py-2 text-sm"
          name="rawContent"
          placeholder="Paste raw text here"
          required
        />
      </form>
      <div className="grid gap-3">
        {(documentsQuery.data ?? []).map((document) => (
          <DocumentRow document={document} key={document.id} projectId={projectId} />
        ))}
        {documentsQuery.data?.length === 0 ? (
          <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
            No documents queued yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function optionalField(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  return value.length > 0 ? value : undefined;
}
