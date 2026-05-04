import type {
  DocumentDetail,
  IngestionJobData,
  MarkdownifyResult,
  PipelineStage
} from "@wiki/shared";

type ProgressReporter = (value: number) => Promise<void>;

export type IngestionPipelineDependencies = {
  createMarkdownVersionFromMarkdownify: (
    documentId: string,
    result: MarkdownifyResult
  ) => Promise<DocumentDetail>;
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
  await updateStage(data.documentId, "markdownify", progress, 10, dependencies);
  const document = await dependencies.getDocument(data.projectId, data.documentId);

  if (!document?.rawContent) {
    throw new Error("Document raw content not found for markdownification");
  }

  const markdownifyResult = await dependencies.markdownifyRawContent(document.rawContent);
  await dependencies.createMarkdownVersionFromMarkdownify(data.documentId, markdownifyResult);
  await progress(30);

  await updateStage(data.documentId, "review", progress, 35, dependencies);

  if (data.ingestionMode === "review") {
    await dependencies.updateDocumentProgress(data.documentId, "awaiting_review", "review");
    await progress(100);
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

  await dependencies.updateDocumentProgress(documentId, "ready", "complete");
  await progress(100);
  await dependencies.updateIngestionJobStatus(documentId, "completed");
}

async function updateStage(
  documentId: string,
  stage: PipelineStage,
  progress: ProgressReporter,
  value: number,
  dependencies: IngestionPipelineDependencies
): Promise<void> {
  await dependencies.updateDocumentProgress(documentId, "processing", stage);
  await progress(value);
}
