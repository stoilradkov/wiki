import { enqueueDocumentIngestion } from "@wiki/backend/modules/ingestion/queue";
import {
  createDocument,
  createQueuedIngestionJob,
  deleteDocument,
  getDocument,
  markQueuedIngestionJobsFailed,
  queueDocumentForReviewApproval,
  queueDocumentForReprocess,
  queueDocumentForStage,
  restoreQueuedDocumentStage
} from "@wiki/backend/modules/documents/repository";
import { env } from "@wiki/backend/env";
import { getAppSettings } from "@wiki/backend/modules/settings/repository";
import type {
  CreateDocumentRequest,
  DocumentDetail,
  IngestionMode,
  ProjectIngestionMode
} from "@wiki/shared";

export class DocumentActionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentActionConflictError";
  }
}

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

export async function approveDocumentReview(
  projectId: string,
  documentId: string
): Promise<DocumentDetail | null> {
  const document = await getDocument(projectId, documentId);

  if (!document) return null;
  if (document.status !== "awaiting_review") {
    throw new Error("Document is not awaiting review");
  }
  if (!document.currentMarkdownVersion) {
    throw new Error("Document has no markdown version to approve");
  }

  const queuedDocument = await queueDocumentForReviewApproval(projectId, documentId);
  if (!queuedDocument) {
    throw new DocumentActionConflictError("Document is no longer awaiting review");
  }

  const payload = {
    projectId,
    ingestionMode: queuedDocument.ingestionMode,
    startStage: "chunk"
  };

  try {
    await createQueuedIngestionJob(documentId, payload);
    await enqueueDocumentIngestion({
      documentId,
      projectId,
      ingestionMode: queuedDocument.ingestionMode,
      startStage: "chunk"
    });
  } catch (error) {
    await markQueuedIngestionJobsFailed(documentId);
    await restoreQueuedDocumentStage(projectId, documentId, "awaiting_review", "review");
    throw error;
  }

  return queuedDocument;
}

export async function rerunDocumentMarkdownify(
  projectId: string,
  documentId: string
): Promise<DocumentDetail | null> {
  const document = await getDocument(projectId, documentId);

  if (!document) return null;
  if (!document.rawContent) {
    throw new Error("Document raw content is not available for markdownification");
  }

  const queuedDocument = await queueDocumentForStage(
    projectId,
    documentId,
    "markdownify",
    document.status
  );
  if (!queuedDocument) {
    throw new DocumentActionConflictError("Document status changed before markdownify rerun");
  }

  const payload = {
    projectId,
    ingestionMode: queuedDocument.ingestionMode,
    startStage: "markdownify"
  };

  try {
    await createQueuedIngestionJob(documentId, payload);
    await enqueueDocumentIngestion({
      documentId,
      projectId,
      ingestionMode: queuedDocument.ingestionMode,
      startStage: "markdownify"
    });
  } catch (error) {
    await markQueuedIngestionJobsFailed(documentId);
    await restoreQueuedDocumentStage(projectId, documentId, document.status, document.pipelineStage);
    throw error;
  }

  return queuedDocument;
}

export async function reprocessCurrentMarkdown(
  projectId: string,
  documentId: string
): Promise<DocumentDetail | null> {
  const document = await getDocument(projectId, documentId);

  if (!document) return null;
  if (!document.currentMarkdownVersion) {
    throw new Error("Document has no markdown version to reprocess");
  }

  const queuedDocument = await queueDocumentForReprocess(projectId, documentId, document.status);
  if (!queuedDocument) {
    throw new DocumentActionConflictError("Document is not ready for reprocessing");
  }

  const payload = {
    projectId,
    ingestionMode: queuedDocument.ingestionMode,
    startStage: "reprocess"
  };

  try {
    await createQueuedIngestionJob(documentId, payload);
    await enqueueDocumentIngestion({
      documentId,
      projectId,
      ingestionMode: queuedDocument.ingestionMode,
      startStage: "reprocess"
    });
  } catch (error) {
    await markQueuedIngestionJobsFailed(documentId);
    await restoreQueuedDocumentStage(projectId, documentId, document.status, document.pipelineStage);
    throw error;
  }

  return queuedDocument;
}

async function resolveProjectIngestionMode(
  projectIngestionMode: ProjectIngestionMode
): Promise<IngestionMode> {
  if (projectIngestionMode !== "inherit") return projectIngestionMode;

  const settings = await getAppSettings(env);
  return settings.defaultIngestionMode;
}
