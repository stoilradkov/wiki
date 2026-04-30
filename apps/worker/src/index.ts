import { createAppInfo, createPublicAiSettings } from "@wiki/shared";
import { env } from "@wiki/worker/env";

const app = createAppInfo();
const databaseConfigured = Boolean(env.DATABASE_URL);
const redisConfigured = Boolean(env.REDIS_URL);
const aiSettings = createPublicAiSettings(env);

console.log(
  JSON.stringify({
    level: "info",
    service: "worker",
    message: "Worker dev process ready",
    app,
    databaseConfigured,
    redisConfigured,
    aiSettings
  })
);

if (!env.GEMINI_API_KEY) {
  console.warn(
    JSON.stringify({
      level: "warn",
      service: "worker",
      message:
        "GEMINI_API_KEY is not configured. AI ingestion will stay unavailable until it is set in the backend and worker environment."
    })
  );
}

const keepAlive = setInterval(() => {
  // Ingestion jobs are introduced in later stories; this keeps dev hot reload active.
}, 60_000);

function shutdown(signal: NodeJS.Signals) {
  clearInterval(keepAlive);
  console.log(
    JSON.stringify({
      level: "info",
      service: "worker",
      message: "Worker dev process stopping",
      signal
    })
  );
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
