# wiki

wiki is a local-first personal wiki app. This repository currently contains a pnpm TypeScript monorepo with frontend, backend, shared contract packages, and Docker development mode.

## Prerequisites

- Node.js 24 or newer.
- pnpm 10.10.0, matching the root `packageManager` field.
- Docker Desktop or Docker Engine with Compose v2 for the Docker dev stack.

Corepack is optional. If `pnpm` is not on your PATH, enable the shim once outside the repo:

```powershell
corepack enable
corepack prepare pnpm@10.10.0 --activate
```

## Install

```powershell
pnpm install
```

Optional local environment overrides can live in `.env`. Start from the checked-in example:

```powershell
Copy-Item .env.example .env
```

## AI Configuration

Gemini is the only AI provider wired for v1. The API key is read by the backend and worker only:

```text
GEMINI_API_KEY=
```

Frontend code must use `/api/settings/ai` for provider and model visibility. That response includes a `secretStatus` value of `configured` or `missing`, but never includes the key itself. If the key is missing, setup warnings are logged by the backend and worker while the rest of the foundation app remains runnable.

These knobs can be changed in `.env` without exposing secrets to the browser:

```text
AI_GENERATION_MODEL=gemini-3-flash
AI_EMBEDDING_MODEL=gemini-embedding-002
AI_EMBEDDING_DIMENSION=768
AI_THINKING_BUDGET_MARKDOWNIFY=256
AI_THINKING_BUDGET_EXTRACTION=256
AI_THINKING_BUDGET_CHAT=512
AI_EMBEDDING_BATCH_SIZE=16
WORKER_RETRY_COUNT=3
WORKER_CONCURRENCY=1
```

## Run In Development

```powershell
pnpm docker:infra
pnpm dev
```

This is the recommended daily development flow. Docker starts only local infrastructure:

- Postgres 16 with pgvector on `127.0.0.1:5432`.
- Redis on `127.0.0.1:6379`.

The local `pnpm dev` process starts:

- Frontend Vite app: http://127.0.0.1:3000
- Backend API: http://127.0.0.1:3001
- Backend health check: http://127.0.0.1:3001/health
- Worker dev process.
- Shared package TypeScript watch mode.

The root `pnpm dev` script uses plain pnpm workspace filters:

```powershell
pnpm --parallel --filter @wiki/shared --filter @wiki/backend --filter @wiki/worker --filter @wiki/frontend dev
```

Stop the local dev servers with `Ctrl+C` in the terminal that is running `pnpm dev`.

Stop the infrastructure containers with:

```powershell
pnpm docker:infra:down
```

## Run The Full Docker Dev Stack

```powershell
pnpm docker:dev
```

This starts the complete local development stack:

- Frontend Vite app with hot reload: http://127.0.0.1:3000
- Backend API with hot reload: http://127.0.0.1:3001
- Worker dev process with hot reload.
- Postgres 16 with pgvector on `127.0.0.1:5432`.
- Redis on `127.0.0.1:6379`.

The frontend dev server proxies `/api/*` requests to the backend service inside Compose. The backend and worker run as separate services from the shared `wiki-backend-dev` image definition.

Stop and remove the dev containers with:

```powershell
pnpm docker:dev:down
```

Use this path when you want a full Docker smoke test. For everyday development, `pnpm docker:infra` plus `pnpm dev` gives faster hot reload and easier debugging.

## Useful Scripts

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm docker:infra
pnpm docker:dev
```

## Workspace Layout

```text
apps/
  backend/    Fastify backend runtime
  worker/     Ingestion worker runtime
  frontend/   React and Vite frontend
packages/
  shared/     Shared DTOs, schemas, and TypeScript contracts
```

Project-local imports use `@wiki/...` aliases. For example:

```ts
import { createAppInfo } from "@wiki/shared";
import { App } from "@wiki/frontend/App";
```

Frontend UI uses Tailwind CSS, shadcn-style component scaffolding, lucide icons, and Axios. New frontend code should prefer package-scoped absolute imports such as `@wiki/frontend/lib/api` and `@wiki/frontend/components/ui/button`.

## Current Scope

Implemented: Story 1.1, Bootstrap the Workspace; Story 1.2, Run the App in Docker Development Mode; Story 13.1, Configure AI Models and Budgets; Story 14.1, Keep Secrets Backend-Only.

Not implemented yet: database schema, ingestion, search, chat, and graph features.

TODO continue with next story from phase-2
