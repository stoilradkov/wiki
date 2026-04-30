import { z } from "zod";

const optionalSecretSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const portSchema = z.coerce.number().int().min(1).max(65_535);

export const backendEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: portSchema.default(3001),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://wiki:wiki@127.0.0.1:5432/wiki"),
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
  GEMINI_API_KEY: optionalSecretSchema
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;

export const workerEnvSchema = backendEnvSchema.omit({
  HOST: true,
  PORT: true
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function parseBackendEnv(
  source: Record<string, string | undefined>
): BackendEnv {
  return backendEnvSchema.parse(source);
}

export function parseWorkerEnv(
  source: Record<string, string | undefined>
): WorkerEnv {
  return workerEnvSchema.parse(source);
}

