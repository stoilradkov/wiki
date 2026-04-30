import { z } from "zod";

const optionalSecretSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const portSchema = z.coerce.number().int().min(1).max(65_535);
const positiveIntSchema = z.coerce.number().int().min(1);
const nonNegativeIntSchema = z.coerce.number().int().min(0);

export const backendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: portSchema.default(3001),
  DATABASE_URL: z.string().min(1).default("postgresql://wiki:wiki@127.0.0.1:5432/wiki"),
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
  GEMINI_API_KEY: optionalSecretSchema,
  AI_PROVIDER: z.literal("gemini").default("gemini"),
  AI_GENERATION_MODEL: z.string().min(1).default("gemini-3-flash"),
  AI_EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-002"),
  AI_EMBEDDING_DIMENSION: positiveIntSchema.default(768),
  AI_THINKING_BUDGET_MARKDOWNIFY: nonNegativeIntSchema.default(256),
  AI_THINKING_BUDGET_EXTRACTION: nonNegativeIntSchema.default(256),
  AI_THINKING_BUDGET_CHAT: nonNegativeIntSchema.default(512),
  AI_EMBEDDING_BATCH_SIZE: positiveIntSchema.default(16),
  WORKER_RETRY_COUNT: nonNegativeIntSchema.default(3),
  WORKER_CONCURRENCY: positiveIntSchema.default(1)
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;

export const workerEnvSchema = backendEnvSchema.omit({
  HOST: true,
  PORT: true
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function parseBackendEnv(source: Record<string, string | undefined>): BackendEnv {
  return backendEnvSchema.parse(source);
}

export function parseWorkerEnv(source: Record<string, string | undefined>): WorkerEnv {
  return workerEnvSchema.parse(source);
}
