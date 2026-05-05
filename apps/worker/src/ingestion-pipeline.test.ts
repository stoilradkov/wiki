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
});

function createDependencies(stageTransitions: Array<PipelineStage>): IngestionPipelineDependencies {
  return {
    createMarkdownVersionFromMarkdownify: vi.fn(async () => document),
    getDocument: vi.fn(async () => document),
    markdownifyRawContent: vi.fn(async () => markdownifyResult),
    updateDocumentProgress: vi.fn(async (_documentId, status, stage) => {
      stageTransitions.push(stage);
      return {
        ...document,
        pipelineStage: stage,
        status,
        updatedAt: "2026-05-04T00:00:01.000Z"
      };
    }),
    updateIngestionJobStatus: vi.fn(async () => undefined)
  };
}
