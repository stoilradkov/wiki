import { loadEnv } from "vite";
import { env as processEnv } from "node:process";
import { z } from "zod";

const frontendDevEnvSchema = z.object({
  VITE_API_PROXY_TARGET: z
    .string()
    .min(1)
    .default("http://127.0.0.1:3001"),
  VITE_DEV_HOST: z.string().min(1).default("127.0.0.1"),
  VITE_DEV_PORT: z.coerce.number().int().min(1).max(65_535).default(3000)
});

export type FrontendDevEnv = z.infer<typeof frontendDevEnvSchema>;

export function loadFrontendDevEnv(
  mode: string,
  envDir: string
): FrontendDevEnv {
  return frontendDevEnvSchema.parse({
    ...loadEnv(mode, envDir, ""),
    ...processEnv
  });
}
