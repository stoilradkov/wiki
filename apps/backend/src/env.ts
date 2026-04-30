import { existsSync } from "node:fs";
import { env as processEnv, loadEnvFile } from "node:process";
import { fileURLToPath, URL } from "node:url";
import { parseBackendEnv } from "@wiki/shared";

const envPath = fileURLToPath(new URL("../../../.env", import.meta.url));

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

export const env = parseBackendEnv(processEnv);
