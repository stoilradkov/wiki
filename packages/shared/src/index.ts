import { z } from "zod";
import type { BackendEnv, WorkerEnv } from "./env";

export {
  backendEnvSchema,
  parseBackendEnv,
  parseWorkerEnv,
  workerEnvSchema,
  type BackendEnv,
  type WorkerEnv
} from "./env";

export const packageName = "wiki";

export const appInfoSchema = z.object({
  name: z.literal(packageName),
  version: z.string().min(1)
});

export type AppInfo = z.infer<typeof appInfoSchema>;

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string().min(1),
  app: appInfoSchema
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const publicAiSettingsSchema = z.object({
  provider: z.literal("gemini"),
  generationModel: z.string().min(1),
  embeddingModel: z.string().min(1),
  embeddingDimension: z.number().int().min(1),
  thinkingBudgets: z.object({
    markdownify: z.number().int().min(0),
    extraction: z.number().int().min(0),
    chat: z.number().int().min(0)
  }),
  embeddingBatchSize: z.number().int().min(1),
  workerRetryCount: z.number().int().min(0),
  workerConcurrency: z.number().int().min(1),
  secretStatus: z.enum(["configured", "missing"])
});

export type PublicAiSettings = z.infer<typeof publicAiSettingsSchema>;

export function createAppInfo(version = "0.1.0"): AppInfo {
  return appInfoSchema.parse({
    name: packageName,
    version
  });
}

export function createPublicAiSettings(env: BackendEnv | WorkerEnv): PublicAiSettings {
  return publicAiSettingsSchema.parse({
    provider: "gemini",
    generationModel: env.AI_GENERATION_MODEL,
    embeddingModel: env.AI_EMBEDDING_MODEL,
    embeddingDimension: env.AI_EMBEDDING_DIMENSION,
    thinkingBudgets: {
      markdownify: env.AI_THINKING_BUDGET_MARKDOWNIFY,
      extraction: env.AI_THINKING_BUDGET_EXTRACTION,
      chat: env.AI_THINKING_BUDGET_CHAT
    },
    embeddingBatchSize: env.AI_EMBEDDING_BATCH_SIZE,
    workerRetryCount: env.WORKER_RETRY_COUNT,
    workerConcurrency: env.WORKER_CONCURRENCY,
    secretStatus: env.GEMINI_API_KEY ? "configured" : "missing"
  });
}
