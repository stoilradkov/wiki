import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  documentIngestionEventSchema,
  ingestionSnapshotEventSchema,
  type Document,
  type DocumentDetail
} from "@wiki/shared";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";

export function useProjectIngestionStream(projectId: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(`/api/projects/${projectId}/ingestion/events`);

    source.addEventListener("ingestion_snapshot", (event) => {
      const parsed = parseMessageEvent(event, ingestionSnapshotEventSchema);
      if (!parsed || parsed.projectId !== projectId) return;

      queryClient.setQueryData<Document[]>(documentQueryKeys.all(projectId), parsed.documents);
    });

    const handleDocumentEvent = (event: Event) => {
      const parsed = parseMessageEvent(event, documentIngestionEventSchema);
      if (!parsed || parsed.projectId !== projectId) return;

      queryClient.setQueryData<Document[]>(documentQueryKeys.all(projectId), (documents) => {
        if (!documents) return documents;

        const found = documents.some((document) => document.id === parsed.document.id);
        if (!found) return [parsed.document, ...documents];

        return documents.map((document) =>
          document.id === parsed.document.id ? parsed.document : document
        );
      });

      queryClient.setQueryData<DocumentDetail>(
        documentQueryKeys.detail(projectId, parsed.document.id),
        (document) => (document ? { ...document, ...parsed.document } : document)
      );
    };

    source.addEventListener("document_status_changed", handleDocumentEvent);
    source.addEventListener("document_stage_changed", handleDocumentEvent);
    source.addEventListener("document_failed", handleDocumentEvent);
    source.addEventListener("document_ready", handleDocumentEvent);

    return () => {
      source.close();
    };
  }, [projectId, queryClient]);
}

function parseMessageEvent<T>(
  event: Event,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }
): T | null {
  if (!(event instanceof MessageEvent)) return null;

  try {
    const payload: unknown = JSON.parse(event.data);
    const parsed = schema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
