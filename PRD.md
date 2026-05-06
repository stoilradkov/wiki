# Product Requirements Document: wiki

This PRD is split by development phase so agents can load only the context needed for the story they are working on.

## Project Statement

wiki is a local self-hosted, AI-powered personal wiki for organizing knowledge across projects. Users paste raw text into a project, and the system cleans it into structured markdown, indexes it for semantic and keyword search, extracts entities and relationships, builds a project-scoped knowledge graph, and enables grounded AI chat with citations.

The product is local-first in infrastructure and storage, with cloud AI assistance. Postgres, Redis, the backend API, ingestion worker, and frontend run locally in Docker. Gemini is the only external dependency for AI model calls in v1. The app is intended for a single user and intentionally omits authentication in v1.

The core user experience is a project workspace. Users create projects, paste documents, review or automatically process generated markdown, search by meaning and exact terms, chat with their knowledge base, inspect source citations, and explore relationships through a graph. The system prioritizes provenance, editability, and trust: raw content is retained by default, AI-generated markdown can be reviewed and versioned, derived data can be regenerated, and chat answers are grounded in stored sources.

## How to Use This PRD

1. Read this root file for product scope, shared architecture, and phase links.
2. Read `IMPLEMENTATION_PLAN.md` for phase order and exit criteria.
3. Read the current story file in `stories/`.
4. Read the matching phase PRD file below.
5. Only open another phase PRD when the story dependency or acceptance criteria explicitly touches that phase.

## Phase PRD Files

- [Phase 1 - Foundation](docs/prd/phase-1-foundation.md): Docker, monorepo, shared contracts, project model, document creation, source metadata, initial workspace, AI settings, and backend-only secrets.
- [Phase 2 - Ingestion and Review](docs/prd/phase-2-ingestion-review.md): async ingestion, markdownification, Auto and Review modes, versioning, duplicate detection, status streams, retry, markdown tabs, and sanitized preview.
- [Phase 3 - Search and Chat](docs/prd/phase-3-search-chat.md): chunking, embeddings, full-text search, hybrid ranking, chat persistence, grounded retrieval, SSE chat streaming, and chunk citations.
- [Phase 4 - Structure and Graph](docs/prd/phase-4-structure-graph.md): structured extraction, tags, entities, triples, graph storage/query/visualization, graph-assisted chat, and soft cross-project links.
- [Phase 5 - Polish, Operations, and Hardening](docs/prd/phase-5-polish-ops.md): production Docker, health/readiness, archive/delete/restore, raw deletion, reconnect, user tags, errors, privacy docs, backups, tests, and logs.

## Product Scope

- v1 supports pasted text ingestion only.
- v1 does not support file upload, PDF import, DOCX import, image OCR, browser clipping, collaborative editing, multi-user auth, or hosted sync.
- The canonical editable content format is markdown.
- Raw pasted content is retained by default for provenance, debugging, and future reprocessing.
- Users can physically delete raw source content from Postgres per document while keeping markdown versions and derived knowledge.
- Documents belong to exactly one project.
- Cross-project search and chat are supported by query scope, not by assigning a document to multiple projects.
- Archived projects are excluded from normal navigation and query scopes by default.

## Major Modules

- Docker platform and runtime: dev and production Compose modes, local Postgres, Redis, API, worker, and frontend runtime.
- Frontend workspace: React application with project dashboard, project workspace layout, document views, search, chat, graph, and settings.
- Backend API: Fastify REST API for projects, documents, search, graph, chat, settings, and event streams.
- Ingestion worker: BullMQ worker that processes documents asynchronously through markdownify, chunking, embedding, extraction, and graph update stages.
- Shared contract layer: shared Zod schemas, enums, request and response DTOs, extraction schemas, event schemas, and frontend/backend TypeScript types.
- AI provider layer: lightweight provider interface with Gemini as the only v1 implementation.
- Persistence layer: Postgres schema managed by Drizzle, including pgvector for embeddings and normalized tables for documents, versions, tags, graph, chat, and settings.
- Search and retrieval engine: hybrid semantic and full-text search with Reciprocal Rank Fusion.
- Chat and citation engine: persisted chat threads, retrieval snapshots, grounded answer generation, SSE token streaming, and chunk-level citations.
- Knowledge graph engine: project-scoped entity and relationship storage, graph query API, graph visualization data shaping, and cross-project soft linking.
- Settings and preferences: durable app settings in Postgres and client-only UI preferences in local storage.
- Observability and operations: health checks, readiness checks, structured logs, job status tracking, backup documentation, and test strategy.

## Technology Stack

- Package manager: pnpm workspaces with a single root lockfile.
- Frontend: React, Vite, TanStack Router, TanStack Query, Axios, Tailwind CSS, react-force-graph-2d, GitHub-flavored markdown rendering.
- Backend: Fastify, TypeScript, Zod validation, fastify-type-provider-zod, Drizzle ORM, Drizzle Kit migrations.
- Worker queue: BullMQ backed by Redis.
- Database: PostgreSQL 16 with pgvector.
- AI provider: Gemini.
- Generation model default: gemini-3.1-flash-lite-preview for markdownification, structured extraction, and chat.
- Embedding model default: gemini-embedding-2 with 768 output dimensions.
- Runtime: latest Node image line for Docker, hot reload in dev, compiled JavaScript in production.

## Shared Decisions

- Gemini is the only implemented provider in v1.
- Gemini API keys live only in backend/worker environment variables and are never exposed to the frontend.
- A lightweight provider abstraction is required so future providers can be added without rewriting product workflows.
- The free Gemini tier is acceptable as the documented default for development and non-sensitive usage.
- Model IDs, thinking budgets, worker concurrency, embedding dimensions, and embedding batch size are configurable.
- Thinking settings are configurable per task and low by default for ingestion.
- Worker concurrency defaults to 1 to respect free-tier limits.
- Gemini rate-limit and quota errors are handled explicitly with backoff, retries, visible failure states, and a retry-later path.
- Documentation and settings must warn that free-tier Gemini usage may be used by Google to improve products, while paid-tier policies may differ.

## Contract and API Rules

- The API is REST JSON under a common API prefix.
- Fastify routes validate requests and responses with shared Zod schemas.
- The frontend uses a simple typed fetch client.
- No OpenAPI generation is required for v1.
- API route categories include projects, documents, document versions, ingestion actions, search, graph, chat, tags, settings, and event streams.
- Backend API routes return stable DTOs rather than raw database rows.
- Shared schemas define enums, request DTOs, response DTOs, extraction output, event payloads, and frontend-facing types.
- Database schema definitions remain backend-only and are not exported as frontend contracts.

## Frontend UX Rules

- The app opens the last opened project when available.
- If no last project exists, the app shows a compact project dashboard.
- The main app uses a project workspace layout with left navigation, main content, and project-level actions.
- Primary views include Documents, Search, Chat, Graph, and Settings.
- The UI should feel like a quiet, dense, work-focused tool, not a marketing site.
- The first screen should be useful, not a landing page.

## Security and Local Access

- v1 is a single-user local app with no authentication.
- Services bind to localhost by default unless explicitly configured otherwise.
- Gemini secrets are backend-only.
- Markdown preview is sanitized and raw HTML is disabled.
- CORS is minimized by using a Vite proxy in development and same-origin serving in production.
