import Fastify from "fastify";
import {
  createAppInfo,
  createPublicAiSettings,
  healthResponseSchema,
  publicAiSettingsSchema
} from "@wiki/shared";
import { env } from "@wiki/backend/env";

const server = Fastify({
  logger: true
});

const getHealth = async () =>
  healthResponseSchema.parse({
    ok: true,
    service: "server",
    app: createAppInfo()
  });

server.get("/health", getHealth);
server.get("/api/health", getHealth);
server.get("/api/settings/ai", async () =>
  publicAiSettingsSchema.parse(createPublicAiSettings(env))
);

const port = env.PORT;
const host = env.HOST;

try {
  await server.listen({ port, host });
  if (!env.GEMINI_API_KEY) {
    server.log.warn(
      "GEMINI_API_KEY is not configured. AI routes will report setup-required until it is set in the backend environment."
    );
  }
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
