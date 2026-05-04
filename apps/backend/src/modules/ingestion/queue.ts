import { Queue } from "bullmq";
import { env } from "@wiki/backend/env";
import { createRedisConnection } from "@wiki/backend/redis/connection";
import { ingestionQueueName, type IngestionJobData } from "@wiki/shared";

const ingestionQueue = new Queue<IngestionJobData>(ingestionQueueName, {
  connection: createRedisConnection(env.REDIS_URL),
  defaultJobOptions: {
    attempts: env.WORKER_RETRY_COUNT + 1,
    backoff: {
      type: "exponential",
      delay: 1_000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export async function enqueueDocumentIngestion(data: IngestionJobData): Promise<void> {
  await ingestionQueue.add("process-document", data, {
    jobId: data.documentId
  });
}

export async function closeDocumentIngestionQueue(): Promise<void> {
  await ingestionQueue.close();
}
