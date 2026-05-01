import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { FilePlus2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreateDocumentRequest, SourceMetadata } from "@wiki/shared";
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
import { Textarea } from "@wiki/frontend/components/ui/textarea";
import {
  DocumentListSkeleton,
  FormErrorBanner,
  LoadingLabel,
  PageError,
  getErrorMessage
} from "@wiki/frontend/components/interaction";
import { createDocument, listDocuments } from "@wiki/frontend/modules/documents/api";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";
import { DocumentRow } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-row";

export const Route = createFileRoute("/projects/$projectId/documents")({
  component: DocumentsView
});

function DocumentsView() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const queryClient = useQueryClient();
  const documentForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      rawContent: "",
      sourceAuthor: "",
      sourceDate: "",
      sourceNote: "",
      sourceTitle: "",
      sourceUrl: "",
      title: ""
    }
  });
  const documentsQuery = useQuery({
    queryKey: documentQueryKeys.all(projectId),
    queryFn: () => listDocuments(projectId)
  });
  const createDocumentMutation = useMutation({
    mutationFn: (input: CreateDocumentRequest) => createDocument(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.all(projectId) })
  });

  function handlePaste(values: DocumentFormValues) {
    const metadata: SourceMetadata = {
      author: optionalValue(values.sourceAuthor),
      note: optionalValue(values.sourceNote),
      sourceDate: optionalValue(values.sourceDate),
      title: optionalValue(values.sourceTitle),
      url: optionalValue(values.sourceUrl)
    };

    createDocumentMutation.mutate(
      {
        rawContent: values.rawContent,
        title: optionalValue(values.title),
        sourceMetadata: metadata
      },
      {
        onSuccess: () => documentForm.reset()
      }
    );
  }

  return (
    <section className="content-panel grid gap-6">
      <Form {...documentForm}>
        <form className="grid gap-3" onSubmit={documentForm.handleSubmit(handlePaste)}>
          <div className="flex items-center justify-between">
            <h3 className="section-title">Paste document</h3>
            <Button
              aria-busy={createDocumentMutation.isPending}
              disabled={createDocumentMutation.isPending}
              type="submit"
            >
              {createDocumentMutation.isPending ? (
                <LoadingLabel>Queueing...</LoadingLabel>
              ) : (
                <>
                  <FilePlus2 className="size-3.75" />
                  Queue
                </>
              )}
            </Button>
          </div>
          <FormErrorBanner>
            {createDocumentMutation.isError
              ? getErrorMessage(
                  createDocumentMutation.error,
                  "Could not queue document. Try again."
                )
              : null}
          </FormErrorBanner>
          <div className="grid grid-cols-2 gap-3">
            {documentTextFields.map((fieldConfig) => (
              <FormField
                control={documentForm.control}
                key={fieldConfig.name}
                name={fieldConfig.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldConfig.label}</FormLabel>
                    <FormControl>
                      <Input type={fieldConfig.type} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormField
            control={documentForm.control}
            name="rawContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Raw text</FormLabel>
                <FormControl>
                  <Textarea className="paste-area" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      <Separator />
      <div className="grid gap-3">
        {documentsQuery.isLoading ? <DocumentListSkeleton /> : null}
        {documentsQuery.isError ? (
          <PageError
            message="Could not load documents for this project"
            onRetry={() => void documentsQuery.refetch()}
          />
        ) : null}
        {documentsQuery.data?.map((document) => (
          <DocumentRow document={document} key={document.id} projectId={projectId} />
        ))}
        {documentsQuery.data?.length === 0 ? (
          <p className="card p-4 text-ui text-muted-foreground">No documents queued yet.</p>
        ) : null}
      </div>
    </section>
  );
}

type DocumentFormValues = {
  rawContent: string;
  sourceAuthor: string;
  sourceDate: string;
  sourceNote: string;
  sourceTitle: string;
  sourceUrl: string;
  title: string;
};

const documentFormSchema = z.object({
  rawContent: z.string().trim().min(1, "Raw text is required"),
  sourceAuthor: z.string(),
  sourceDate: z.string(),
  sourceNote: z.string(),
  sourceTitle: z.string(),
  sourceUrl: z.union([z.string().url("Source URL must be valid"), z.literal("")]),
  title: z.string()
});

const documentTextFields: Array<{
  label: string;
  name: Exclude<keyof DocumentFormValues, "rawContent">;
  type?: string;
}> = [
  { label: "Title", name: "title" },
  { label: "Source URL", name: "sourceUrl", type: "url" },
  { label: "Source title", name: "sourceTitle" },
  { label: "Author or source", name: "sourceAuthor" },
  { label: "Source date", name: "sourceDate", type: "date" },
  { label: "Source note", name: "sourceNote" }
];

function optionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
