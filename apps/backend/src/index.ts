import { env } from "@wiki/backend/env";
import { registerDocumentRoutes } from "@wiki/backend/modules/documents/routes";
import { registerProjectRoutes } from "@wiki/backend/modules/projects/routes";
import { sendValidationError } from "@wiki/backend/routes/helpers";
import {
  createAppInfo,
  createPublicAiSettings,
  domainEnums,
  domainEnumsSchema,
  healthResponseSchema,
  publicAiSettingsSchema
} from "@wiki/shared";
import Fastify from "fastify";
import { ZodError } from "zod";

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
server.get("/api/contracts/domain", async () => domainEnumsSchema.parse(domainEnums));
server.get("/api/settings/ai", async () =>
  publicAiSettingsSchema.parse(createPublicAiSettings(env))
);

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

await registerProjectRoutes(server);
await registerDocumentRoutes(server);

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
