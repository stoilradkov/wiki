import { Worker } from "bullmq";
import { env } from "@wiki/worker/env";
import { createRedisConnection } from "@wiki/backend/redis/connection";
import {
  createAppInfo,
  createPublicAiSettings,
  domainEnums,
  ingestionJobDataSchema,
  ingestionQueueName,
  type IngestionJobData,
  type PipelineStage
} from "@wiki/shared";
import {
  updateDocumentProgress,
  updateIngestionJobStatus
} from "@wiki/backend/modules/documents/repository";

async function updateStage(
  documentId: string,
  stage: PipelineStage,
  progress: (value: number) => Promise<void>,
  value: number
): Promise<void> {
  await updateDocumentProgress(documentId, "processing", stage);
  await progress(value);
}

async function processDocument(
  data: IngestionJobData,
  progress: (value: number) => Promise<void>
): Promise<void> {
  await updateIngestionJobStatus(data.documentId, "processing");
  await updateStage(data.documentId, "markdownify", progress, 10);
  await updateStage(data.documentId, "review", progress, 35);

  if (data.ingestionMode === "review") {
    await updateDocumentProgress(data.documentId, "awaiting_review", "review");
    await progress(100);
    await updateIngestionJobStatus(data.documentId, "completed");
    return;
  }

  await updateStage(data.documentId, "chunk", progress, 50);
  await updateStage(data.documentId, "embed", progress, 65);
  await updateStage(data.documentId, "extract", progress, 80);
  await updateStage(data.documentId, "graph", progress, 90);
  await updateDocumentProgress(data.documentId, "ready", "complete");
  await progress(100);
  await updateIngestionJobStatus(data.documentId, "completed");
}

async function markTerminalFailure(documentId: string): Promise<void> {
  try {
    await updateDocumentProgress(documentId, "failed", "markdownify");
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
        "GEMINI_API_KEY is not configured. Markdownification currently uses mocked stage transitions until AI ingestion is wired."
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
    void markTerminalFailure(documentId);
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
