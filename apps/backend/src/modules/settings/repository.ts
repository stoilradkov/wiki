import { eq } from "drizzle-orm";
import {
  appSettingsSchema,
  createPublicAiSettings,
  type AppSettings,
  type BackendEnv,
  type UpdateAppSettingsRequest
} from "@wiki/shared";
import { db } from "@wiki/backend/db/client";
import { appSettings } from "@wiki/backend/db/schema";

const SETTINGS_ID = "global";
const toIso = (value: Date) => value.toISOString();

function mapAppSettings(row: typeof appSettings.$inferSelect, env: BackendEnv): AppSettings {
  return appSettingsSchema.parse({
    defaultIngestionMode: row.defaultIngestionMode,
    ai: createPublicAiSettings(env),
    updatedAt: toIso(row.updatedAt)
  });
}

export async function getAppSettings(env: BackendEnv): Promise<AppSettings> {
  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID))
    .limit(1);

  if (existing) return mapAppSettings(existing, env);

  const [created] = await db.insert(appSettings).values({ id: SETTINGS_ID }).returning();

  if (!created) {
    throw new Error("App settings insert returned no row");
  }

  return mapAppSettings(created, env);
}

export async function updateAppSettings(
  env: BackendEnv,
  input: UpdateAppSettingsRequest
): Promise<AppSettings> {
  await getAppSettings(env);

  const [updated] = await db
    .update(appSettings)
    .set({
      ...input,
      updatedAt: new Date()
    })
    .where(eq(appSettings.id, SETTINGS_ID))
    .returning();

  if (!updated) {
    throw new Error("App settings update returned no row");
  }

  return mapAppSettings(updated, env);
}
