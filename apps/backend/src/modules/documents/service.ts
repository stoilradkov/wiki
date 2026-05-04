import { enqueueDocumentIngestion } from "@wiki/backend/modules/ingestion/queue";
import {
  createDocument,
  deleteDocument
} from "@wiki/backend/modules/documents/repository";
import type { CreateDocumentRequest, DocumentDetail, IngestionMode } from "@wiki/shared";

export async function createDocumentAndEnqueueIngestion(
  projectId: string,
  projectIngestionMode: IngestionMode,
  input: CreateDocumentRequest
): Promise<DocumentDetail> {
  const document = await createDocument(projectId, projectIngestionMode, input);

  try {
    await enqueueDocumentIngestion({
      documentId: document.id,
      projectId,
      ingestionMode: document.ingestionMode
    });
  } catch (error) {
    await deleteDocument(document.id);
    throw error;
  }

  return document;
}
