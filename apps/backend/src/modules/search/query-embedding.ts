import { createGoogleGenerativeAI, type GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import { embed } from "ai";
import { env } from "@wiki/backend/env";
import type { EmbeddingTaskType } from "@wiki/shared";

const QUERY_EMBEDDING_TASK_TYPE: EmbeddingTaskType = "RETRIEVAL_QUERY";

export async function embedSearchQuery(query: string): Promise<number[]> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required for hybrid search");
  }

  const google = createGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY
  });
  const model = google.embedding(normalizeGeminiModelName(env.AI_EMBEDDING_MODEL));
  const result = await embed({
    model,
    value: query,
    maxRetries: env.WORKER_RETRY_COUNT,
    providerOptions: {
      google: {
        outputDimensionality: env.AI_EMBEDDING_DIMENSION,
        taskType: QUERY_EMBEDDING_TASK_TYPE
      } satisfies GoogleEmbeddingModelOptions
    }
  });

  if (result.embedding.length !== env.AI_EMBEDDING_DIMENSION) {
    throw new Error(
      `Query embedding dimension mismatch: expected ${env.AI_EMBEDDING_DIMENSION}, got ${result.embedding.length}`
    );
  }

  return result.embedding;
}

function normalizeGeminiModelName(modelName: string): string {
  return modelName.startsWith("models/") ? modelName.slice("models/".length) : modelName;
}
