import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Document, DocumentStatus, PipelineStage, SourceMetadata } from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@wiki/frontend/components/ui/form";
import { Input } from "@wiki/frontend/components/ui/input";
import { Separator } from "@wiki/frontend/components/ui/separator";
import { FieldError, LoadingLabel } from "@wiki/frontend/components/interaction";
import { updateDocumentMetadata } from "@wiki/frontend/modules/documents/api";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";
import { DocumentStatusBadge } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-status-badge";
import { PipelineStageBar } from "@wiki/frontend/routes/projects/$projectId/documents/-components/pipeline-stage-bar";

type DocumentRowDocument = {
  id: string;
  title: string | null;
  status: DocumentStatus | string;
  pipelineStage: PipelineStage | string | null;
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
  const [inlineError, setInlineError] = useState<string | null>(null);
  const metadataForm = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataFormSchema),
    defaultValues: getMetadataDefaults(document)
  });
  const processing = document.status === "processing";
  const metadataMutation = useMutation({
    mutationFn: (input: { title: string | null; sourceMetadata: SourceMetadata }) =>
      updateDocumentMetadata(projectId, document.id, input),
    onMutate: async (input) => {
      setInlineError(null);
      await queryClient.cancelQueries({ queryKey: documentQueryKeys.all(projectId) });
      const previous = queryClient.getQueryData<Document[]>(documentQueryKeys.all(projectId));
      queryClient.setQueryData<Document[]>(documentQueryKeys.all(projectId), (old) =>
        old?.map((candidate) =>
          candidate.id === document.id
            ? { ...candidate, title: input.title, sourceMetadata: input.sourceMetadata }
            : candidate
        )
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(documentQueryKeys.all(projectId), context?.previous);
      setInlineError("Metadata reverted - could not save. Try again.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.all(projectId) })
  });

  useEffect(() => {
    metadataForm.reset(getMetadataDefaults(document));
  }, [document.id, document.sourceMetadata, document.title, metadataForm]);

  function handleMetadata(values: MetadataFormValues) {
    metadataMutation.mutate({
      title: optionalValue(values.title) ?? null,
      sourceMetadata: {
        author: optionalValue(values.sourceAuthor),
        note: optionalValue(values.sourceNote),
        sourceDate: optionalValue(values.sourceDate),
        title: optionalValue(values.sourceTitle),
        url: optionalValue(values.sourceUrl)
      }
    });
  }

  return (
    <article
      className={`card grid gap-3 p-3.5 ${document.status === "failed" ? "border-l-4 border-l-coral" : document.status === "awaiting_review" ? "border-l-4 border-l-blue" : ""}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h4 className="truncate text-ui font-medium text-foreground">
            {document.title ?? "Untitled document"}
          </h4>
          <p className="meta mt-1">
            {document.pipelineStage ?? "no stage"} / {new Date(document.createdAt).toLocaleString()}
          </p>
        </div>
        <DocumentStatusBadge status={document.status} />
      </div>
      <p className="line-clamp-2 text-caption leading-relaxed text-muted-foreground">
        {document.sourceMetadata.note ?? document.sourceMetadata.title ?? "No source preview"}
      </p>
      {document.status === "processing" || document.pipelineStage ? (
        <PipelineStageBar stage={document.pipelineStage} />
      ) : null}
      <Separator />
      <div className="flex items-center justify-between gap-3">
        <span className="tag">{document.sourceMetadata.title ?? "No source title"}</span>
        <span className="meta">{document.id.slice(0, 8)}</span>
      </div>
      <Form {...metadataForm}>
        <form
          className="grid grid-cols-6 gap-2"
          onSubmit={metadataForm.handleSubmit(handleMetadata)}
        >
          {metadataFields.map((fieldConfig) => (
            <FormField
              control={metadataForm.control}
              key={fieldConfig.name}
              name={fieldConfig.name}
                render={({ field }) => (
                  <FormItem className={fieldConfig.className}>
                  <FormLabel className="text-micro text-faint">{fieldConfig.label}</FormLabel>
                  <FormControl>
                    <Input
                      className="px-2 py-1.5 text-caption"
                      disabled={processing}
                      type={fieldConfig.type}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            aria-busy={metadataMutation.isPending}
            className="self-end"
            disabled={metadataMutation.isPending || processing}
            size="sm"
            type="submit"
            variant="ghost"
          >
            {metadataMutation.isPending ? <LoadingLabel>Saving...</LoadingLabel> : "Save metadata"}
          </Button>
          <div className="col-span-6">
            <FieldError>{inlineError}</FieldError>
          </div>
        </form>
      </Form>
    </article>
  );
}

type MetadataFormValues = {
  sourceAuthor: string;
  sourceDate: string;
  sourceNote: string;
  sourceTitle: string;
  sourceUrl: string;
  title: string;
};

const metadataFormSchema = z.object({
  sourceAuthor: z.string(),
  sourceDate: z.string(),
  sourceNote: z.string(),
  sourceTitle: z.string(),
  sourceUrl: z.union([z.string().url("URL must be valid"), z.literal("")]),
  title: z.string()
});

const metadataFields: Array<{
  className?: string;
  label: string;
  name: keyof MetadataFormValues;
  type?: string;
}> = [
  { label: "Title", name: "title" },
  { label: "URL", name: "sourceUrl", type: "url" },
  { label: "Source title", name: "sourceTitle" },
  { label: "Author", name: "sourceAuthor" },
  { label: "Date", name: "sourceDate", type: "date" },
  { className: "col-span-6", label: "Source note", name: "sourceNote" }
];

function getMetadataDefaults(document: DocumentRowDocument): MetadataFormValues {
  return {
    sourceAuthor: document.sourceMetadata.author ?? "",
    sourceDate: document.sourceMetadata.sourceDate ?? "",
    sourceNote: document.sourceMetadata.note ?? "",
    sourceTitle: document.sourceMetadata.title ?? "",
    sourceUrl: document.sourceMetadata.url ?? "",
    title: document.title ?? ""
  };
}

function optionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
