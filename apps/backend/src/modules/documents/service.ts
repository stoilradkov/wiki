import { enqueueDocumentIngestion } from "@wiki/backend/modules/ingestion/queue";
import {
  createDocument,
  createQueuedIngestionJob,
  deleteDocument,
  getDocument,
  markQueuedIngestionJobsFailed,
  queueFailedDocumentForRetry,
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
  IngestionJobData,
  IngestionMode,
  ProjectIngestionMode
} from "@wiki/shared";

export class DocumentActionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentActionConflictError";
  }
}

async function enqueueWithRollback(
  documentId: string,
  payload: Omit<IngestionJobData, "documentId">,
  rollback: () => Promise<unknown>
): Promise<void> {
  const jobData: IngestionJobData = { documentId, ...payload };

  try {
    const ingestionJobId = await createQueuedIngestionJob(documentId, jobData);
    await enqueueDocumentIngestion(jobData, ingestionJobId);
  } catch (error) {
    await rollbackPreservingError(error, async () => {
      await markQueuedIngestionJobsFailed(documentId);
      await rollback();
    });
  }
}

async function rollbackPreservingError(
  error: unknown,
  rollback: () => Promise<unknown>
): Promise<never> {
  try {
    await rollback();
  } catch (rollbackError) {
    if (error instanceof Error && error.cause === undefined) {
      error.cause = rollbackError;
    }
  }

  throw error;
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
    const data = {
      documentId: document.id,
      projectId,
      ingestionMode: document.ingestionMode
    };
    const ingestionJobId = await createQueuedIngestionJob(document.id, data);
    await enqueueDocumentIngestion(data, ingestionJobId);
  } catch (error) {
    await rollbackPreservingError(error, () => deleteDocument(document.id));
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

  await enqueueWithRollback(
    documentId,
    {
      projectId,
      ingestionMode: queuedDocument.ingestionMode,
      startStage: "chunk"
    },
    () => restoreQueuedDocumentStage(projectId, documentId, "awaiting_review", "review")
  );

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

  await enqueueWithRollback(
    documentId,
    {
      projectId,
      ingestionMode: queuedDocument.ingestionMode,
      startStage: "markdownify"
    },
    () =>
      restoreQueuedDocumentStage(projectId, documentId, document.status, document.pipelineStage)
  );

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

  await enqueueWithRollback(
    documentId,
    {
      projectId,
      ingestionMode: queuedDocument.ingestionMode,
      startStage: "reprocess"
    },
    () =>
      restoreQueuedDocumentStage(projectId, documentId, document.status, document.pipelineStage)
  );

  return queuedDocument;
}

export async function retryFailedDocumentIngestion(
  projectId: string,
  documentId: string
): Promise<DocumentDetail | null> {
  const document = await getDocument(projectId, documentId);

  if (!document) return null;
  if (document.status !== "failed") {
    throw new Error("Document is not failed");
  }
  if (!document.rawContent && !document.currentMarkdownVersion) {
    throw new Error("Document has no source or markdown version to retry");
  }

  const pipelineStage = getFailedRetryPipelineStage(document);
  const queuedDocument = await queueFailedDocumentForRetry(projectId, documentId, pipelineStage);
  if (!queuedDocument) {
    throw new DocumentActionConflictError("Document is no longer failed");
  }

  await enqueueWithRollback(
    documentId,
    {
      projectId,
      ingestionMode: queuedDocument.ingestionMode,
      startStage: "retry"
    },
    () =>
      restoreQueuedDocumentStage(
        projectId,
        documentId,
        document.status,
        document.pipelineStage,
        getDocumentFailure(document)
      )
  );

  return queuedDocument;
}

async function resolveProjectIngestionMode(
  projectIngestionMode: ProjectIngestionMode
): Promise<IngestionMode> {
  if (projectIngestionMode !== "inherit") return projectIngestionMode;

  const settings = await getAppSettings(env);
  return settings.defaultIngestionMode;
}

function getDocumentFailure(
  document: DocumentDetail
): { code: NonNullable<DocumentDetail["errorCode"]>; message: string } | undefined {
  if (!document.errorCode || !document.errorMessage) return undefined;
  return { code: document.errorCode, message: document.errorMessage };
}

function getFailedRetryPipelineStage(document: DocumentDetail): "markdownify" | "chunk" {
  if (document.currentMarkdownVersion && !document.rawContent) return "chunk";
  if (document.currentMarkdownVersion && document.pipelineStage !== "markdownify") return "chunk";
  return "markdownify";
}
