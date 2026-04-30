/// <reference types="node" />

import { env } from "node:process";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL ?? "postgresql://wiki:wiki@127.0.0.1:5432/wiki"
  }
});
