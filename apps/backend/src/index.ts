import { env } from "@wiki/backend/env";
import { registerDocumentRoutes } from "@wiki/backend/modules/documents/routes";
import { closeDocumentIngestionQueue } from "@wiki/backend/modules/ingestion/queue";
import { registerProjectRoutes } from "@wiki/backend/modules/projects/routes";
import { registerSettingsRoutes } from "@wiki/backend/modules/settings/routes";
import { sendValidationError } from "@wiki/backend/routes/helpers";
import {
  createAppInfo,
  domainEnums,
  domainEnumsSchema,
  healthResponseSchema
} from "@wiki/shared";
import Fastify from "fastify";
import { ZodError } from "zod";

const server = Fastify({
  logger: true
});
let closing = false;

const getHealth = async () =>
  healthResponseSchema.parse({
    ok: true,
    service: "server",
    app: createAppInfo()
  });

server.get("/health", getHealth);
server.get("/api/health", getHealth);
server.get("/api/contracts/domain", async () => domainEnumsSchema.parse(domainEnums));

server.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    void sendValidationError(error, reply);
    return;
  }

  request.log.error(error);
  void reply.status(500).send({
    error: "internal_error",
    message: "Unexpected server error"
  });
});

server.addHook("onClose", async () => {
  await closeDocumentIngestionQueue();
});

await registerProjectRoutes(server);
await registerDocumentRoutes(server);
await registerSettingsRoutes(server);

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

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (closing) return;
  closing = true;

  server.log.info({ signal }, "Server process stopping");
  try {
    await server.close();
    process.exit(0);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

process.on("SIGINT", (signal) => {
  void shutdown(signal);
});
process.on("SIGTERM", (signal) => {
  void shutdown(signal);
});
