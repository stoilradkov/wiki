import {
  createMarkdownVersionFromMarkdownify,
  deleteDocumentDerivedDataForReprocess,
  getDocument,
  markDocumentFailed,
  updateDocumentProgress,
  updateIngestionJobStatus
} from "@wiki/backend/modules/documents/repository";
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
import { markdownifyRawContent } from "@wiki/worker/markdownify";
import { Worker } from "bullmq";

async function processDocument(
  data: IngestionJobData,
  progress: (event: DocumentIngestionEvent) => Promise<void>
): Promise<void> {
  await processDocumentIngestion(data, progress, {
    createMarkdownVersionFromMarkdownify,
    deleteDocumentDerivedDataForReprocess,
    getDocument,
    markdownifyRawContent,
    updateDocumentProgress,
    updateIngestionJobStatus
  });
}

async function markTerminalFailure(
  error: Error,
  documentId: string,
  publish: (document: DocumentDetail) => Promise<void>
): Promise<void> {
  try {
    const document = await markDocumentFailed(
      documentId,
      classifyIngestionError(error)
    );
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

function classifyIngestionError(error: Error): {
  code: NonNullable<DocumentDetail["errorCode"]>;
  message: string;
} {
  const normalized = error.message.toLowerCase();

  if (normalized.includes("quota") || normalized.includes("rate limit")) {
    return {
      code: "quota_exceeded",
      message: "AI quota or rate limit was reached. Retry later."
    };
  }

  if (normalized.includes("validation") || normalized.includes("zod")) {
    return {
      code: "validation_failed",
      message: "Generated content did not match the expected format. Retry ingestion."
    };
  }

  if (normalized.includes("embed")) {
    return {
      code: "embedding_failed",
      message: "Embedding generation failed. Retry ingestion."
    };
  }

  if (normalized.includes("database") || normalized.includes("postgres")) {
    return {
      code: "database_error",
      message: "Database update failed during ingestion. Retry after the service recovers."
    };
  }

  if (normalized.includes("gemini") || normalized.includes("model")) {
    return {
      code: "model_error",
      message: "AI model request failed. Retry ingestion."
    };
  }

  return {
    code: "unknown_error",
    message: "Ingestion failed unexpectedly. Retry ingestion."
  };
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
    await processDocument(data, (value) => job.updateProgress(value));
  },
  {
    connection: createRedisConnection(env.REDIS_URL),
    concurrency: env.WORKER_CONCURRENCY
  }
);

worker.on("failed", (job, error) => {
  const documentId = job?.data.documentId;
  const attempts = typeof job?.opts.attempts === "number" ? job.opts.attempts : 1;
  const exhausted = job ? job.attemptsMade >= attempts : true;
  console.error(
    JSON.stringify({
      level: "error",
      service: "worker",
      message: "Document ingestion job failed",
      jobId: job?.id,
      documentId,
      attemptsMade: job?.attemptsMade,
      attempts,
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
