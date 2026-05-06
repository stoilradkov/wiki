import {
  chunkCurrentMarkdownVersion,
  createMarkdownVersionFromMarkdownify,
  deleteDocumentDerivedDataForReprocess,
  getDocument,
  listCurrentDocumentChunksForEmbedding,
  markDocumentFailed,
  updateDocumentChunkEmbeddings,
  updateDocumentProgress,
  updateIngestionJobStatus
} from "@wiki/backend/modules/documents/repository";
import {
  getExtractionDocumentInput,
  storeStructuredExtractionResult
} from "@wiki/backend/modules/structure/repository";
import { createRedisConnection } from "@wiki/backend/redis/connection";
import {
  createAppInfo,
  createPublicAiSettings,
  documentIngestionEventSchema,
  documentSchema,
  domainEnums,
  ingestionJobDataSchema,
  ingestionQueueName,
  type DocumentIngestionEvent,
  type DocumentDetail,
  type IngestionJobData
} from "@wiki/shared";
import { env } from "@wiki/worker/env";
import { processDocumentIngestion } from "@wiki/worker/ingestion-pipeline";
import { classifyIngestionError } from "@wiki/worker/ingestion-errors";
import { embedCurrentDocumentChunks } from "@wiki/worker/embeddings";
import { extractStructuredDocument } from "@wiki/worker/extraction";
import { markdownifyRawContent } from "@wiki/worker/markdownify";
import { Worker } from "bullmq";

async function processDocument(
  data: IngestionJobData,
  jobId: string,
  progress: (event: DocumentIngestionEvent) => Promise<void>
): Promise<void> {
  await processDocumentIngestion(data, progress, {
    chunkCurrentMarkdownVersion,
    createMarkdownVersionFromMarkdownify,
    deleteDocumentDerivedDataForReprocess,
    embedCurrentDocumentChunks: (documentId) =>
      embedCurrentDocumentChunks(documentId, {
        listCurrentDocumentChunksForEmbedding,
        updateDocumentChunkEmbeddings
      }),
    extractAndStoreStructuredDocument: async (documentId) => {
      const input = await getExtractionDocumentInput(documentId);
      const result = await extractStructuredDocument(input);
      return storeStructuredExtractionResult(documentId, input.markdownVersionId, result);
    },
    getDocument,
    markdownifyRawContent,
    updateDocumentProgress,
    updateIngestionJobStatus: (documentId, status) =>
      updateIngestionJobStatus(documentId, status, jobId)
  });
}

async function markTerminalFailure(
  error: Error,
  documentId: string,
  publish: (document: DocumentDetail) => Promise<void>
): Promise<void> {
  try {
    const classification = classifyIngestionError(error);
    const document = await markDocumentFailed(documentId, classification);
    await publish(document);
    await updateIngestionJobStatus(documentId, "failed");
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "worker",
        message: "Failed to persist terminal ingestion failure",
        documentId,
        error: error instanceof Error ? error.message : String(error)
      })
    );
  }
}

const app = createAppInfo();
const databaseConfigured = Boolean(env.DATABASE_URL);
const redisConfigured = Boolean(env.REDIS_URL);
const aiSettings = createPublicAiSettings(env);

console.log(
  JSON.stringify({
    level: "info",
    service: "worker",
    message: "Worker process ready",
    app,
    databaseConfigured,
    redisConfigured,
    aiSettings,
    supportedDocumentStatuses: domainEnums.documentStatuses,
    supportedPipelineStages: domainEnums.pipelineStages,
    concurrency: env.WORKER_CONCURRENCY
  })
);

if (!env.GEMINI_API_KEY) {
  console.warn(
    JSON.stringify({
      level: "warn",
      service: "worker",
      message:
        "GEMINI_API_KEY is not configured. Markdownification jobs will fail until it is set in the worker environment."
    })
  );
}

const worker = new Worker<IngestionJobData>(
  ingestionQueueName,
  async (job) => {
    const data = ingestionJobDataSchema.parse(job.data);
    await processDocument(data, job.id ?? data.documentId, (value) => job.updateProgress(value));
  },
  {
    connection: createRedisConnection(env.REDIS_URL),
    concurrency: env.WORKER_CONCURRENCY
  }
);

worker.on("failed", (job, error) => {
  const documentId = job?.data.documentId;
  const classification = classifyIngestionError(error);
  const attempts = typeof job?.opts.attempts === "number" ? job.opts.attempts : 1;
  const exhausted = job ? job.attemptsMade >= attempts : true;
  console.error(
    JSON.stringify({
      level: exhausted ? "error" : "warn",
      service: "worker",
      message: exhausted
        ? "Document ingestion job exhausted retries"
        : "Document ingestion job failed; retry scheduled by BullMQ",
      jobId: job?.id,
      documentId,
      projectId: job?.data.projectId,
      ingestionMode: job?.data.ingestionMode,
      startStage: job?.data.startStage ?? "markdownify",
      attemptsMade: job?.attemptsMade,
      attempts,
      attemptsRemaining: Math.max(attempts - (job?.attemptsMade ?? attempts), 0),
      errorCode: classification.code,
      errorReason: classification.reason,
      retryable: classification.retryable,
      error: error.message
    })
  );

  if (documentId && exhausted) {
    void markTerminalFailure(error, documentId, async (document) => {
      await job.updateProgress(
        documentIngestionEventSchema.parse({
          type: "document_failed",
          projectId: document.projectId,
          document: documentSchema.parse(document),
          occurredAt: new Date().toISOString()
        })
      );
    });
  }
});

async function shutdown(signal: NodeJS.Signals) {
  console.log(
    JSON.stringify({
      level: "info",
      service: "worker",
      message: "Worker process stopping",
      signal
    })
  );
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", (signal) => {
  void shutdown(signal);
});
process.on("SIGTERM", (signal) => {
  void shutdown(signal);
});
