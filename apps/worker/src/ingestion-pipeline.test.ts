import { describe, expect, it, vi } from "vitest";
import type {
  DocumentIngestionEvent,
  DocumentDetail,
  IngestionJobData,
  MarkdownifyResult,
  PipelineStage
} from "@wiki/shared";
import {
  processDocumentIngestion,
  type IngestionPipelineDependencies
} from "@wiki/worker/ingestion-pipeline";

const baseJob: IngestionJobData = {
  documentId: "11111111-1111-4111-8111-111111111111",
  ingestionMode: "auto",
  projectId: "22222222-2222-4222-8222-222222222222"
};

const markdownifyResult: MarkdownifyResult = {
  markdown: "# Trusted source\n\nUseful content.",
  title: "Trusted source"
};

const document: DocumentDetail = {
  createdAt: "2026-05-04T00:00:00.000Z",
  currentMarkdownVersion: null,
  currentMarkdownVersionId: null,
  errorCode: null,
  errorMessage: null,
  id: baseJob.documentId,
  ingestionMode: "auto",
  pipelineStage: "markdownify",
  projectId: baseJob.projectId,
  rawContent: "Trusted source\nUseful content.",
  rawContentHash: "raw-hash",
  rawContentStored: true,
  sourceMetadata: {},
  status: "queued",
  title: null,
  updatedAt: "2026-05-04T00:00:00.000Z"
};

const currentMarkdownVersion = {
  author: "ai" as const,
  createdAt: "2026-05-04T00:00:01.000Z",
  documentId: baseJob.documentId,
  id: "33333333-3333-4333-8333-333333333333",
  markdown: "# Trusted source\n\nUseful content.",
  markdownHash: "markdown-hash",
  versionNumber: 1
};

describe("processDocumentIngestion", () => {
  it("continues auto mode through downstream stages and marks document ready", async () => {
    const progressEvents: DocumentIngestionEvent[] = [];
    const stageTransitions: Array<PipelineStage> = [];
    const dependencies = createDependencies(stageTransitions);

    await processDocumentIngestion(
      baseJob,
      async (event) => {
        progressEvents.push(event);
      },
      dependencies
    );

    expect(stageTransitions).toEqual([
      "markdownify",
      "review",
      "chunk",
      "embed",
      "extract",
      "graph",
      "complete"
    ]);
    expect(dependencies.chunkCurrentMarkdownVersion).toHaveBeenCalledWith(baseJob.documentId);
    expect(dependencies.embedCurrentDocumentChunks).toHaveBeenCalledWith(baseJob.documentId);
    expect(progressEvents.map((event) => event.document.pipelineStage)).toEqual([
      "markdownify",
      "review",
      "chunk",
      "embed",
      "extract",
      "graph",
      "complete"
    ]);
    expect(dependencies.updateIngestionJobStatus).toHaveBeenLastCalledWith(
      baseJob.documentId,
      "completed"
    );
  });

  it("pauses review mode after markdownification", async () => {
    const progressEvents: DocumentIngestionEvent[] = [];
    const stageTransitions: Array<PipelineStage> = [];
    const dependencies = createDependencies(stageTransitions);

    await processDocumentIngestion(
      { ...baseJob, ingestionMode: "review" },
      async (event) => {
        progressEvents.push(event);
      },
      dependencies
    );

    expect(stageTransitions).toEqual(["markdownify", "review", "review"]);
    expect(progressEvents.map((event) => event.document.status)).toEqual([
      "processing",
      "processing",
      "awaiting_review"
    ]);
    expect(dependencies.updateDocumentProgress).toHaveBeenLastCalledWith(
      baseJob.documentId,
      "awaiting_review",
      "review"
    );
  });

  it("resumes approved review documents from chunking", async () => {
    const progressEvents: DocumentIngestionEvent[] = [];
    const stageTransitions: Array<PipelineStage> = [];
    const dependencies = createDependencies(stageTransitions);

    await processDocumentIngestion(
      { ...baseJob, ingestionMode: "review", startStage: "chunk" },
      async (event) => {
        progressEvents.push(event);
      },
      dependencies
    );

    expect(stageTransitions).toEqual(["chunk", "embed", "extract", "graph", "complete"]);
    expect(dependencies.chunkCurrentMarkdownVersion).toHaveBeenCalledWith(baseJob.documentId);
    expect(dependencies.embedCurrentDocumentChunks).toHaveBeenCalledWith(baseJob.documentId);
    expect(progressEvents.map((event) => event.document.pipelineStage)).toEqual([
      "chunk",
      "embed",
      "extract",
      "graph",
      "complete"
    ]);
    expect(dependencies.markdownifyRawContent).not.toHaveBeenCalled();
    expect(dependencies.updateIngestionJobStatus).toHaveBeenLastCalledWith(
      baseJob.documentId,
      "completed"
    );
  });

  it("cleans derived data before reprocessing current markdown", async () => {
    const progressEvents: DocumentIngestionEvent[] = [];
    const stageTransitions: Array<PipelineStage> = [];
    const dependencies = createDependencies(stageTransitions);

    await processDocumentIngestion(
      { ...baseJob, startStage: "reprocess" },
      async (event) => {
        progressEvents.push(event);
      },
      dependencies
    );

    expect(dependencies.deleteDocumentDerivedDataForReprocess).toHaveBeenCalledWith(
      baseJob.documentId
    );
    expect(stageTransitions).toEqual(["chunk", "embed", "extract", "graph", "complete"]);
    expect(dependencies.chunkCurrentMarkdownVersion).toHaveBeenCalledWith(baseJob.documentId);
    expect(dependencies.embedCurrentDocumentChunks).toHaveBeenCalledWith(baseJob.documentId);
    expect(progressEvents.map((event) => event.document.pipelineStage)).toEqual([
      "chunk",
      "embed",
      "extract",
      "graph",
      "complete"
    ]);
    expect(dependencies.markdownifyRawContent).not.toHaveBeenCalled();
    expect(dependencies.createMarkdownVersionFromMarkdownify).not.toHaveBeenCalled();
  });

  it("cleans derived data before retrying full pipeline from raw content", async () => {
    const progressEvents: DocumentIngestionEvent[] = [];
    const stageTransitions: Array<PipelineStage> = [];
    const dependencies = createDependencies(stageTransitions);

    await processDocumentIngestion(
      { ...baseJob, startStage: "retry" },
      async (event) => {
        progressEvents.push(event);
      },
      dependencies
    );

    expect(dependencies.deleteDocumentDerivedDataForReprocess).toHaveBeenCalledWith(
      baseJob.documentId
    );
    expect(stageTransitions).toEqual([
      "markdownify",
      "review",
      "chunk",
      "embed",
      "extract",
      "graph",
      "complete"
    ]);
    expect(dependencies.markdownifyRawContent).toHaveBeenCalledWith(document.rawContent);
    expect(dependencies.createMarkdownVersionFromMarkdownify).toHaveBeenCalledWith(
      baseJob.documentId,
      markdownifyResult
    );
  });

  it("retries from current markdown when raw content is unavailable", async () => {
    const progressEvents: DocumentIngestionEvent[] = [];
    const stageTransitions: Array<PipelineStage> = [];
    const dependencies = createDependencies(stageTransitions, {
      ...document,
      currentMarkdownVersion,
      currentMarkdownVersionId: currentMarkdownVersion.id,
      pipelineStage: "chunk",
      rawContent: null,
      rawContentStored: false
    });

    await processDocumentIngestion(
      { ...baseJob, startStage: "retry" },
      async (event) => {
        progressEvents.push(event);
      },
      dependencies
    );

    expect(dependencies.deleteDocumentDerivedDataForReprocess).toHaveBeenCalledWith(
      baseJob.documentId
    );
    expect(stageTransitions).toEqual(["chunk", "embed", "extract", "graph", "complete"]);
    expect(dependencies.chunkCurrentMarkdownVersion).toHaveBeenCalledWith(baseJob.documentId);
    expect(dependencies.embedCurrentDocumentChunks).toHaveBeenCalledWith(baseJob.documentId);
    expect(dependencies.markdownifyRawContent).not.toHaveBeenCalled();
    expect(dependencies.createMarkdownVersionFromMarkdownify).not.toHaveBeenCalled();
  });

  it("retries downstream failures from current markdown even when raw content is stored", async () => {
    const progressEvents: DocumentIngestionEvent[] = [];
    const stageTransitions: Array<PipelineStage> = [];
    const dependencies = createDependencies(stageTransitions, {
      ...document,
      currentMarkdownVersion,
      currentMarkdownVersionId: currentMarkdownVersion.id,
      pipelineStage: "embed",
      status: "failed"
    });

    await processDocumentIngestion(
      { ...baseJob, startStage: "retry" },
      async (event) => {
        progressEvents.push(event);
      },
      dependencies
    );

    expect(dependencies.deleteDocumentDerivedDataForReprocess).toHaveBeenCalledWith(
      baseJob.documentId
    );
    expect(stageTransitions).toEqual(["chunk", "embed", "extract", "graph", "complete"]);
    expect(dependencies.chunkCurrentMarkdownVersion).toHaveBeenCalledWith(baseJob.documentId);
    expect(dependencies.embedCurrentDocumentChunks).toHaveBeenCalledWith(baseJob.documentId);
    expect(dependencies.markdownifyRawContent).not.toHaveBeenCalled();
    expect(dependencies.createMarkdownVersionFromMarkdownify).not.toHaveBeenCalled();
  });
});

function createDependencies(
  stageTransitions: Array<PipelineStage>,
  sourceDocument = document
): IngestionPipelineDependencies {
  return {
    chunkCurrentMarkdownVersion: vi.fn(async () => []),
    createMarkdownVersionFromMarkdownify: vi.fn(async () => sourceDocument),
    deleteDocumentDerivedDataForReprocess: vi.fn(async () => undefined),
    embedCurrentDocumentChunks: vi.fn(async () => undefined),
    getDocument: vi.fn(async () => sourceDocument),
    markdownifyRawContent: vi.fn(async () => markdownifyResult),
    updateDocumentProgress: vi.fn(async (_documentId, status, stage) => {
      stageTransitions.push(stage);
      return {
        ...sourceDocument,
        pipelineStage: stage,
        status,
        updatedAt: "2026-05-04T00:00:01.000Z"
      };
    }),
    updateIngestionJobStatus: vi.fn(async () => undefined)
  };
}
