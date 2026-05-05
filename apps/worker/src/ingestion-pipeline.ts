import type {
  Document,
  DocumentDetail,
  DocumentIngestionEvent,
  DocumentStatus,
  EventType,
  IngestionJobData,
  MarkdownifyResult,
  PipelineStage
} from "@wiki/shared";
import { documentIngestionEventSchema, documentSchema } from "@wiki/shared";

type ProgressReporter = (event: DocumentIngestionEvent) => Promise<void>;

export type IngestionPipelineDependencies = {
  createMarkdownVersionFromMarkdownify: (
    documentId: string,
    result: MarkdownifyResult
  ) => Promise<DocumentDetail>;
  deleteDocumentDerivedDataForReprocess: (documentId: string) => Promise<void>;
  getDocument: (projectId: string, documentId: string) => Promise<DocumentDetail | null>;
  markdownifyRawContent: (rawContent: string) => Promise<MarkdownifyResult>;
  updateDocumentProgress: (
    documentId: string,
    status: "processing" | "awaiting_review" | "ready",
    pipelineStage: PipelineStage
  ) => Promise<DocumentDetail>;
  updateIngestionJobStatus: (
    documentId: string,
    status: "processing" | "completed"
  ) => Promise<void>;
};

const autoStages: Array<{ progress: number; stage: PipelineStage }> = [
  { stage: "chunk", progress: 50 },
  { stage: "embed", progress: 65 },
  { stage: "extract", progress: 80 },
  { stage: "graph", progress: 90 }
];

export async function processDocumentIngestion(
  data: IngestionJobData,
  progress: ProgressReporter,
  dependencies: IngestionPipelineDependencies
): Promise<void> {
  await dependencies.updateIngestionJobStatus(data.documentId, "processing");

  if (data.startStage === "chunk") {
    await continueAutoIngestion(data.documentId, progress, dependencies);
    return;
  }

  if (data.startStage === "reprocess") {
    await dependencies.deleteDocumentDerivedDataForReprocess(data.documentId);
    await continueAutoIngestion(data.documentId, progress, dependencies);
    return;
  }

  if (data.startStage === "retry") {
    await dependencies.deleteDocumentDerivedDataForReprocess(data.documentId);
    const document = await dependencies.getDocument(data.projectId, data.documentId);

    if (!document) {
      throw new Error("Document not found for retry");
    }

    if (shouldRetryMarkdownify(document)) {
      await markdownifyAndContinue(data, progress, dependencies);
      return;
    }

    if (document.currentMarkdownVersion) {
      await continueAutoIngestion(data.documentId, progress, dependencies);
      return;
    }

    throw new Error("Document has no source or markdown version for retry");
  }

  await markdownifyAndContinue(data, progress, dependencies);
}

async function markdownifyAndContinue(
  data: IngestionJobData,
  progress: ProgressReporter,
  dependencies: IngestionPipelineDependencies
): Promise<void> {
  await updateStage(data.documentId, "markdownify", progress, 10, dependencies);
  const document = await dependencies.getDocument(data.projectId, data.documentId);

  if (!document?.rawContent) {
    throw new Error("Document raw content not found for markdownification");
  }

  const markdownifyResult = await dependencies.markdownifyRawContent(document.rawContent);
  await dependencies.createMarkdownVersionFromMarkdownify(data.documentId, markdownifyResult);

  await updateStage(data.documentId, "review", progress, 35, dependencies);

  if (data.ingestionMode === "review") {
    await updateStatus(data.documentId, "awaiting_review", "review", progress, dependencies);
    await dependencies.updateIngestionJobStatus(data.documentId, "completed");
    return;
  }

  await continueAutoIngestion(data.documentId, progress, dependencies);
}

async function continueAutoIngestion(
  documentId: string,
  progress: ProgressReporter,
  dependencies: IngestionPipelineDependencies
): Promise<void> {
  for (const step of autoStages) {
    await updateStage(documentId, step.stage, progress, step.progress, dependencies);
  }

  await updateStatus(documentId, "ready", "complete", progress, dependencies);
  await dependencies.updateIngestionJobStatus(documentId, "completed");
}

async function updateStage(
  documentId: string,
  stage: PipelineStage,
  progress: ProgressReporter,
  value: number,
  dependencies: IngestionPipelineDependencies
): Promise<void> {
  await updateStatus(documentId, "processing", stage, progress, dependencies);
  void value;
}

async function updateStatus(
  documentId: string,
  status: "processing" | "awaiting_review" | "ready",
  stage: PipelineStage,
  progress: ProgressReporter,
  dependencies: IngestionPipelineDependencies
): Promise<void> {
  const document = await dependencies.updateDocumentProgress(documentId, status, stage);
  await progress(createIngestionEvent(document, status));
}

function createIngestionEvent(
  document: DocumentDetail,
  status: DocumentStatus
): DocumentIngestionEvent {
  return documentIngestionEventSchema.parse({
    type: getIngestionEventType(status),
    projectId: document.projectId,
    document: documentSchema.parse(document) satisfies Document,
    occurredAt: new Date().toISOString()
  });
}

function getIngestionEventType(status: DocumentStatus): EventType {
  if (status === "failed") return "document_failed";
  if (status === "ready") return "document_ready";
  return "document_stage_changed";
}

function shouldRetryMarkdownify(document: DocumentDetail): boolean {
  return (
    (document.pipelineStage === "markdownify" && Boolean(document.rawContent)) ||
    !document.currentMarkdownVersion
  );
}
