---
name: backend
description: Backend implementation rules for the wiki app, covering Fastify routes, repositories, Drizzle ORM, migrations, typed environment access, shared Zod schemas, error handling, and module boundaries. Use when working on backend routes, repositories, services, database queries, schema changes, migrations, environment configuration, or API response validation.
---

# Backend Skill

## Stack

- Fastify + Drizzle ORM + TypeScript
- All schemas (request, response, DB shapes) defined in `@wiki/shared` — never redefine in backend
- Env access only via typed `env` object from `@wiki/backend/env` — never `process.env` directly

## Module structure

Each feature is a self-contained module under `modules/[feature]/`:

```
modules/
  settings/
    routes.ts       ← Fastify route registration only
    repository.ts   ← all DB logic
  documents/
    routes.ts
    repository.ts
```

No business logic in routes. No HTTP concerns in repositories. If logic fits neither, put in `service.ts` in the same module.

## Routes

- One `registerXxxRoutes(server: FastifyInstance)` per module, exported from `routes.ts`
- Registered in `server.ts` as: `await registerXxxRoutes(server)`
- Parse/validate request bodies via `parseBody(request, schema)` using shared Zod schemas
- Parse/validate responses by calling `schema.parse()` on the repository return before returning
- Never return raw DB rows from a route — always pass through Zod parse
- No `db` imports in route files — all DB access via repository

```typescript
export async function registerSettingsRoutes(server: FastifyInstance) {
  server.get("/api/settings", async () => appSettingsSchema.parse(await getAppSettings(env)));
  server.patch("/api/settings", async (request) => {
    const body = parseBody(request, updateAppSettingsRequestSchema);
    return appSettingsSchema.parse(await updateAppSettings(env, body));
  });
}
```

## Repository

- All DB queries live here — no `db` imports outside `repository.ts` files
- Always use a mapper function (`mapXxx`) to convert raw DB rows to domain types
- Mapper functions always pass through shared Zod schema: `return xxxSchema.parse({...})`
- Always check insert/update `.returning()` produced a row — throw descriptive `Error` if not:
  ```typescript
  if (!updated) throw new Error("Settings update returned no row");
  ```
- Use `$inferSelect` / `$inferInsert` for typing raw row inputs to mapper functions
- Repository functions are plain `async` functions — no classes

```typescript
function mapAppSettings(row: typeof appSettings.$inferSelect, env: BackendEnv): AppSettings {
  return appSettingsSchema.parse({ ...row, ai: createPublicAiSettings(env) });
}

export async function getAppSettings(env: BackendEnv): Promise<AppSettings> {
  const [row] = await db.select().from(appSettings).where(...).limit(1);
  if (!row) { /* insert default and return */ }
  return mapAppSettings(row, env);
}
```

## Drizzle ORM

- Schema defined in `db/schema.ts` — one file, all tables
- DB client imported from `@wiki/backend/db/client`
- Use Drizzle query builder for all queries — raw SQL only for pgvector similarity queries
- pgvector: use `sql` tagged template: `` sql`embedding <=> ${vec}::vector` ``

## Migrations

- Never write migration files manually
- After changing `db/schema.ts`: `pnpm db:generate`
- To apply pending migrations: `pnpm db:migrate`
- Never run raw `ALTER TABLE` or schema-modifying SQL by hand

## Error handling

- Throw plain `Error` with descriptive messages from repositories — Fastify's error handler formats them
- Never swallow errors with empty catch blocks
- Never expose stack traces or raw DB errors to API responses

## Do not

- Import `db` outside `repository.ts` files
- Use `process.env` directly
- Write raw migration SQL manually
- Return raw DB rows from routes without Zod parsing
- Define Zod schemas in the backend — they live in `@wiki/shared`
- Put DB logic in routes or HTTP logic in repositories
