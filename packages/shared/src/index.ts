import { z } from "zod";

export {
  backendEnvSchema,
  parseBackendEnv,
  parseWorkerEnv,
  workerEnvSchema,
  type BackendEnv,
  type WorkerEnv
} from "@wiki/shared/env";

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

export function createAppInfo(version = "0.1.0"): AppInfo {
  return appInfoSchema.parse({
    name: packageName,
    version
  });
}
