import { env } from "@wiki/backend/env";
import {
  getAppSettings,
  updateAppSettings
} from "@wiki/backend/modules/settings/repository";
import { parseBody } from "@wiki/backend/routes/helpers";
import {
  appSettingsSchema,
  createPublicAiSettings,
  publicAiSettingsSchema,
  updateAppSettingsRequestSchema
} from "@wiki/shared";
import type { FastifyInstance } from "fastify";

export async function registerSettingsRoutes(server: FastifyInstance) {
  server.get("/api/settings", async () => appSettingsSchema.parse(await getAppSettings(env)));

  server.patch("/api/settings", async (request) => {
    const body = parseBody(request, updateAppSettingsRequestSchema);
    return appSettingsSchema.parse(await updateAppSettings(env, body));
  });

  server.get("/api/settings/ai", async () =>
    publicAiSettingsSchema.parse(createPublicAiSettings(env))
  );
}
