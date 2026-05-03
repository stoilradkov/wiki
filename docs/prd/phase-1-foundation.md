# Phase 1 PRD - Foundation

Goal: create the working skeleton of the local Docker app.

Use with `stories/phase-1-foundation.md`.

## Phase Scope

Phase 1 establishes the monorepo, Docker dev environment, shared contracts, core API validation, database foundation, project CRUD, initial document creation, workspace shell, configuration, and secret handling.

## Relevant Cross-Phase Context

- Later ingestion depends on documents being created immediately with durable queued status.
- Later search, chat, and graph features depend on stable project IDs, document IDs, source metadata, and shared enums.
- Later operations depend on environment-driven configuration and backend-only secret handling.

## Docker and Runtime

- The full app runs in Docker.
- Dev mode supports hot reload for frontend, backend API, and worker.
- Docker Compose includes Postgres and Redis as stateful infrastructure.
- Backend API and ingestion worker are separate services but share the same backend image.
- In development, Vite serves the frontend separately and proxies API calls to the backend.
- Production mode is implemented later, but Phase 1 should not block it: backend should be able to serve built frontend assets in production later.

## Workspace and Shared Contracts

- Use pnpm workspaces with a single root lockfile.
- Package boundaries separate frontend UI, backend runtime, and shared DTO/schema contracts.
- Shared TypeScript configuration is available to all packages.
- Shared Zod schemas, enums, request DTOs, response DTOs, extraction output schemas, event payloads, and frontend-facing types live in the shared package.
- Database schema definitions remain backend-only and are not exported as frontend contracts.
- Fastify routes validate requests and responses with shared Zod schemas.
- Backend routes return stable DTOs rather than raw database rows.
- No OpenAPI generation is required for v1.

## Shared Domain Enums

- Shared enums cover document status, ingestion mode, extraction profile, entity type, predicate, event type, and pipeline stage.
- Document statuses include queued, processing, awaiting_review, ready, failed, dirty, deleted, and needs_reprocess where applicable.
- Pipeline stages include markdownify, review, chunk, embed, extract, graph, and complete.
- Entity type enum includes person, organization, company, tool, technology, project, document, concept, topic, place, event, task, decision, metric, activity, habit, goal, resource, method, and other.
- Predicate enum includes mentions, related_to, uses, depends_on, part_of, created_by, owned_by, works_at, located_in, decided, requires, and blocks.

## Project Model

- Projects are the top-level namespace for documents, search, chat, graph data, and settings.
- Projects include name, description, color, icon, archive state, ingestion mode override, extraction profile, and optional custom extraction instructions.
- Projects use archive as the normal removal flow.
- Hard delete is available later only as an explicit danger-zone action and cascades project-scoped data.
- Each project can inherit the global ingestion mode or override it.
- Each project has an extraction profile that biases Gemini extraction while still using the global entity type enum.
- Supported extraction profiles include general, work, research, personal, health, learning, and custom.
- Custom profiles use custom instructions only; they do not introduce project-specific entity schemas in v1.

## Document Creation and Source Metadata

- Pasting content creates a document immediately with durable queued status.
- v1 supports pasted text ingestion only.
- File upload, PDF import, DOCX import, image OCR, browser clipping, collaborative editing, multi-user auth, and hosted sync are out of scope.
- Documents belong to exactly one project.
- Documents include optional user-provided title and optional source metadata.
- If a user does not provide a title, Gemini suggests one during markdownification in Phase 2.
- Source metadata is editable after document creation and appears in citations and search results when available.
- Source metadata includes URL, source title, author or source name, source date, note, and flexible metadata for future importers.
- Raw pasted content is stored by default as immutable provenance.
- Raw content deletion is implemented later, but schema should allow deletion timestamp and raw content hash preservation.

## Settings and AI Configuration

- Durable app settings live in Postgres.
- Client-only UI preferences live in local storage.
- Global settings include default ingestion mode and visible AI configuration values.
- Local storage can store sidebar state, active tabs, and other non-critical UI preferences.
- Last opened project is stored durably and can also be cached client-side for quick routing.
- Generation model, embedding model, embedding dimension, thinking budgets, embedding batch size, worker retry count, and worker concurrency are configurable.
- Gemini is the only implemented provider in v1.
- The free Gemini tier is acceptable as the documented default for development and non-sensitive usage.
- Gemini API keys are read only by backend and worker services.
- Frontend never receives the Gemini secret.
- Settings can show provider/model information without revealing the key.
- Logs must not print secrets.
- Missing key errors are clear during setup.

## Initial Frontend Workspace

- The main app uses a project workspace layout with left navigation, main content, and project-level actions.
- Primary views include Documents, Search, Chat, Graph, and Settings.
- The workspace is dense, readable, and suited to repeated use.
- There is no marketing-style landing page inside the app flow.
- Common actions are reachable from the project context.
- Project names are visible in navigation and scope selectors.
- Project detail includes ingestion and extraction settings.

## Phase 1 Exit Context

By end of Phase 1, the app should start in Docker dev mode, projects can be created and listed, pasted text creates a queued document, shared DTOs and validation are in place, and AI settings/secrets are configured even if full ingestion is still mocked.
