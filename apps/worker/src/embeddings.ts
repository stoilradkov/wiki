import { createGoogleGenerativeAI, type GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import { embedMany, type EmbeddingModel } from "ai";
import { env } from "@wiki/worker/env";
import type { ChunkEmbeddingUpdate, ChunkForEmbedding } from "@wiki/backend/modules/documents/repository";
import type { EmbeddingTaskType } from "@wiki/shared";

const DOCUMENT_EMBEDDING_TASK_TYPE: EmbeddingTaskType = "RETRIEVAL_DOCUMENT";

export type EmbeddingDependencies = {
  listCurrentDocumentChunksForEmbedding: (documentId: string) => Promise<ChunkForEmbedding[]>;
  updateDocumentChunkEmbeddings: (
    updates: ChunkEmbeddingUpdate[],
    metadata: {
      dimension: number;
      embeddedAt: Date;
      model: string;
      taskType: EmbeddingTaskType;
    }
  ) => Promise<void>;
};

export async function embedCurrentDocumentChunks(
  documentId: string,
  dependencies: EmbeddingDependencies
): Promise<void> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required for embeddings");
  }

  const chunks = await dependencies.listCurrentDocumentChunksForEmbedding(documentId);
  if (chunks.length === 0) return;

  const google = createGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY
  });
  const modelName = normalizeGeminiModelName(env.AI_EMBEDDING_MODEL);
  const model = google.embedding(modelName);
  const metadata = {
    dimension: env.AI_EMBEDDING_DIMENSION,
    embeddedAt: new Date(),
    model: env.AI_EMBEDDING_MODEL,
    taskType: DOCUMENT_EMBEDDING_TASK_TYPE
  };

  for (const batch of chunkArray(chunks, env.AI_EMBEDDING_BATCH_SIZE)) {
    await embedBatchWithFallback(batch, model, dependencies, metadata);
  }
}

function normalizeGeminiModelName(modelName: string): string {
  return modelName.startsWith("models/") ? modelName.slice("models/".length) : modelName;
}

async function embedBatchWithFallback(
  chunks: ChunkForEmbedding[],
  model: EmbeddingModel,
  dependencies: EmbeddingDependencies,
  metadata: {
    dimension: number;
    embeddedAt: Date;
    model: string;
    taskType: EmbeddingTaskType;
  }
): Promise<void> {
  try {
    await embedBatch(chunks, model, dependencies, metadata);
  } catch (error) {
    if (chunks.length === 1) throw error;

    const splitAt = Math.ceil(chunks.length / 2);
    await embedBatchWithFallback(chunks.slice(0, splitAt), model, dependencies, metadata);
    await embedBatchWithFallback(chunks.slice(splitAt), model, dependencies, metadata);
  }
}

async function embedBatch(
  chunks: ChunkForEmbedding[],
  model: EmbeddingModel,
  dependencies: EmbeddingDependencies,
  metadata: {
    dimension: number;
    embeddedAt: Date;
    model: string;
    taskType: EmbeddingTaskType;
  }
): Promise<void> {
  const result = await embedMany({
    model,
    values: chunks.map((chunk) => chunk.content),
    maxRetries: env.WORKER_RETRY_COUNT,
    maxParallelCalls: 1,
    providerOptions: {
      google: {
        outputDimensionality: metadata.dimension,
        taskType: metadata.taskType
      } satisfies GoogleEmbeddingModelOptions
    }
  });

  if (result.embeddings.length !== chunks.length) {
    throw new Error("Embedding result count did not match chunk count");
  }

  await dependencies.updateDocumentChunkEmbeddings(
    chunks.map((chunk, index) => ({
      chunkId: chunk.id,
      embedding: result.embeddings[index] ?? []
    })),
    metadata
  );
}

function chunkArray<T>(items: T[], batchSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    chunks.push(items.slice(index, index + batchSize));
  }

  return chunks;
}
