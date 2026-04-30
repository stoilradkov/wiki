import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@wiki/backend/env";
import * as schema from "@wiki/backend/db/schema";

export const sqlClient = postgres(env.DATABASE_URL, {
  max: 5,
  onnotice: () => undefined
});

export const db = drizzle(sqlClient, { schema });
