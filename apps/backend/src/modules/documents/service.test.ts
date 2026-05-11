import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDocumentAndEnqueueIngestion } from "@wiki/backend/modules/documents/service";
import { documentDetailSchema } from "@wiki/shared";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  createQueuedIngestionJob: vi.fn(),
  deleteDocument: vi.fn(),
  enqueueDocumentIngestion: vi.fn(),
  getAppSettings: vi.fn(),
  getDocument: vi.fn(),
  markQueuedIngestionJobsFailed: vi.fn(),
  queueDocumentForReviewApproval: vi.fn(),
  queueDocumentForReprocess: vi.fn(),
  queueDocumentForStage: vi.fn(),
  queueFailedDocumentForRetry: vi.fn(),
  restoreQueuedDocumentStage: vi.fn()
}));

vi.mock("@wiki/backend/env", () => ({
  env: {}
}));

vi.mock("@wiki/backend/modules/documents/repository", () => ({
  createDocument: mocks.createDocument,
  createQueuedIngestionJob: mocks.createQueuedIngestionJob,
  deleteDocument: mocks.deleteDocument,
  getDocument: mocks.getDocument,
  markQueuedIngestionJobsFailed: mocks.markQueuedIngestionJobsFailed,
  queueDocumentForReviewApproval: mocks.queueDocumentForReviewApproval,
  queueDocumentForReprocess: mocks.queueDocumentForReprocess,
  queueDocumentForStage: mocks.queueDocumentForStage,
  queueFailedDocumentForRetry: mocks.queueFailedDocumentForRetry,
  restoreQueuedDocumentStage: mocks.restoreQueuedDocumentStage
}));

vi.mock("@wiki/backend/modules/ingestion/queue", () => ({
  enqueueDocumentIngestion: mocks.enqueueDocumentIngestion
}));

vi.mock("@wiki/backend/modules/settings/repository", () => ({
  getAppSettings: mocks.getAppSettings
}));

const projectId = "00000000-0000-4000-8000-00000000000a";
const documentId = "00000000-0000-4000-8000-000000000010";

const document = documentDetailSchema.parse({
  id: documentId,
  projectId,
  title: "Import notes",
  status: "queued",
  pipelineStage: "markdownify",
  errorCode: null,
  errorMessage: null,
  ingestionMode: "auto",
  currentMarkdownVersionId: null,
  sourceMetadata: {},
  rawContentStored: true,
  rawContentHash: "raw-content-hash",
  rawContent: "Raw notes",
  currentMarkdownVersion: null,
  embeddingStats: {
    completed: 0,
    failed: 0,
    partiallyEmbedded: false,
    pending: 0,
    total: 0
  },
  createdAt: "2026-05-11T08:00:00.000Z",
  updatedAt: "2026-05-11T08:00:00.000Z"
});

describe("documents service", () => {
  beforeEach(() => {
    mocks.createDocument.mockReset();
    mocks.createQueuedIngestionJob.mockReset();
    mocks.deleteDocument.mockReset();
    mocks.enqueueDocumentIngestion.mockReset();
    mocks.getAppSettings.mockReset();
    mocks.getDocument.mockReset();
    mocks.markQueuedIngestionJobsFailed.mockReset();
    mocks.queueDocumentForReviewApproval.mockReset();
    mocks.queueDocumentForReprocess.mockReset();
    mocks.queueDocumentForStage.mockReset();
    mocks.queueFailedDocumentForRetry.mockReset();
    mocks.restoreQueuedDocumentStage.mockReset();
  });

  it("preserves the enqueue error when created document cleanup fails", async () => {
    const queueError = new Error("Queue unavailable");
    const deleteError = new Error("Delete failed");
    mocks.createDocument.mockResolvedValue(document);
    mocks.createQueuedIngestionJob.mockResolvedValue("ingestion-job-id");
    mocks.enqueueDocumentIngestion.mockRejectedValue(queueError);
    mocks.deleteDocument.mockRejectedValue(deleteError);

    await expect(
      createDocumentAndEnqueueIngestion(projectId, "auto", {
        title: "Import notes",
        rawContent: "Raw notes",
        sourceMetadata: {}
      })
    ).rejects.toBe(queueError);

    expect(queueError.cause).toBe(deleteError);
    expect(mocks.deleteDocument).toHaveBeenCalledWith(documentId);
  });
});
