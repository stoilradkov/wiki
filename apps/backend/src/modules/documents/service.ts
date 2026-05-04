import { enqueueDocumentIngestion } from "@wiki/backend/modules/ingestion/queue";
import {
  createDocument,
  deleteDocument
} from "@wiki/backend/modules/documents/repository";
import { env } from "@wiki/backend/env";
import { getAppSettings } from "@wiki/backend/modules/settings/repository";
import type {
  CreateDocumentRequest,
  DocumentDetail,
  IngestionMode,
  ProjectIngestionMode
} from "@wiki/shared";

export async function createDocumentAndEnqueueIngestion(
  projectId: string,
  projectIngestionMode: ProjectIngestionMode,
  input: CreateDocumentRequest
): Promise<DocumentDetail> {
  const document = await createDocument(
    projectId,
    await resolveProjectIngestionMode(projectIngestionMode),
    input
  );

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

async function resolveProjectIngestionMode(
  projectIngestionMode: ProjectIngestionMode
): Promise<IngestionMode> {
  if (projectIngestionMode !== "inherit") return projectIngestionMode;

  const settings = await getAppSettings(env);
  return settings.defaultIngestionMode;
}
