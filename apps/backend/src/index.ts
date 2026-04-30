import Fastify from "fastify";
import { createAppInfo, healthResponseSchema } from "@wiki/shared";
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

const port = env.PORT;
const host = env.HOST;

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
