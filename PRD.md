# Product Requirements Document: wiki

## Project Statement

wiki is a local self-hosted, AI-powered personal wiki for organizing knowledge across projects. Users paste raw text into a project, and the system cleans it into structured markdown, indexes it for semantic and keyword search, extracts entities and relationships, builds a project-scoped knowledge graph, and enables grounded AI chat with citations.

The product is local-first in infrastructure and storage, with cloud AI assistance. Postgres, Redis, the backend API, ingestion worker, and frontend run locally in Docker. Gemini is the only external dependency for AI model calls in v1. The app is intended for a single user and intentionally omits authentication in v1.

The core user experience is a project workspace. Users create projects, paste documents, review or automatically process generated markdown, search by meaning and exact terms, chat with their knowledge base, inspect source citations, and explore relationships through a graph. The system prioritizes provenance, editability, and trust: raw content is retained by default, AI-generated markdown can be reviewed and versioned, derived data can be regenerated, and chat answers are grounded in stored sources.

## Implementation and Architectural Decisions

### Major Modules

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

### Product Scope

- v1 supports pasted text ingestion only.
- v1 does not support file upload, PDF import, DOCX import, image OCR, browser clipping, collaborative editing, multi-user auth, or hosted sync.
- The canonical editable content format is markdown.
- Raw pasted content is retained by default for provenance, debugging, and future reprocessing.
- Users can physically delete raw source content from Postgres per document while keeping markdown versions and derived knowledge.
- Documents belong to exactly one project.
- Cross-project search and chat are supported by query scope, not by assigning a document to multiple projects.
- Archived projects are excluded from normal navigation and query scopes by default.

### Technology Stack

- Package manager: pnpm workspaces with a single root lockfile.
- Frontend: React, Vite, TanStack Router, TanStack Query, Axios, Tailwind CSS, react-force-graph-2d, GitHub-flavored markdown rendering.
- Backend: Fastify, TypeScript, Zod validation, fastify-type-provider-zod, Drizzle ORM, Drizzle Kit migrations.
- Worker queue: BullMQ backed by Redis.
- Database: PostgreSQL 16 with pgvector.
- AI provider: Gemini.
- Generation model default: gemini-2.5-flash for markdownification, structured extraction, and chat.
- Embedding model default: gemini-embedding-001 with 768 output dimensions.
- Runtime: latest Node image line for Docker, hot reload in dev, compiled JavaScript in production.

### Docker and Runtime Architecture

- The full app runs in Docker.
- Dev mode supports hot reload for frontend, backend API, and worker.
- Production mode uses built containers and a single web entry point.
- Backend API and ingestion worker are separate services but share the same backend image.
- In production, the backend serves the built frontend static assets.
- In development, Vite serves the frontend separately and proxies API calls to the backend.
- Docker Compose includes Postgres and Redis as stateful infrastructure.
- A production migration step runs before the API and worker become ready.

### AI Provider and Privacy Decisions

- Gemini is the only implemented provider in v1.
- A lightweight provider abstraction is required so future providers can be added without rewriting product workflows.
- Gemini API keys live only in backend/worker environment variables and are never exposed to the frontend.
- The free Gemini tier is acceptable as the documented default for development and non-sensitive usage.
- Documentation and settings must clearly warn that free-tier Gemini usage may be used by Google to improve products, while paid-tier policies may differ.
- Model IDs, thinking budgets, worker concurrency, embedding dimensions, and embedding batch size are configurable.
- Thinking settings are configurable per task and low by default for ingestion.
- Worker concurrency defaults to 1 to respect free-tier limits.
- Gemini rate-limit and quota errors are handled explicitly with backoff, retries, visible failure states, and a retry-later path.

### Project Model

- Projects are the top-level namespace for documents, search, chat, graph data, and settings.
- Projects include name, description, color, icon, archive state, ingestion mode override, extraction profile, and optional custom extraction instructions.
- Projects use archive as the normal removal flow.
- Hard delete is available only as an explicit danger-zone action and cascades project-scoped data.
- Each project can inherit the global ingestion mode or override it.
- Each project has an extraction profile that biases Gemini extraction while still using the global entity type enum.
- Supported extraction profiles include general, work, research, personal, health, learning, and custom.
- Custom profiles use custom instructions only; they do not introduce project-specific entity schemas in v1.

### Document Model

- Pasting content creates a document immediately with durable queued status.
- Documents include optional user-provided title and optional source metadata.
- If a user does not provide a title, Gemini suggests one during markdownification.
- Source metadata is editable after document creation and appears in citations and search results.
- Source metadata includes URL, source title, author or source name, source date, note, and flexible metadata for future importers.
- Raw content is stored by default as immutable provenance.
- Raw content can be physically removed from Postgres while retaining markdown versions and derived capabilities.
- Raw content deletion records a deletion timestamp and preserves a raw content hash for deduplication.
- Document deletion is soft delete first.
- Soft-deleting a document immediately deletes derived chunks, embeddings, and graph edges so deleted content does not appear in search, chat, or graph views.
- Restoring a soft-deleted document marks it as needing reprocess.
- Empty trash performs hard deletion.

### Duplicate Detection

- The system computes a hash of raw pasted content.
- Exact duplicate detection is scoped to project.
- When a duplicate is detected, the user can open the existing document, create anyway, or cancel.
- Duplicate detection is advisory, not a hard block.
- Markdown versions also store a markdown hash for idempotency, version comparison, and future normalized duplicate detection.
- Document merge workflows are out of scope for v1.

### Ingestion Modes and Review Workflow

- The app supports two ingestion modes: Auto and Review.
- Auto mode is the default: paste, markdownify, then continue automatically through the rest of the pipeline.
- Review mode is opt-in: paste, markdownify, pause for review, allow edits, then continue only after user confirmation.
- Ingestion mode exists at global default, project override, and per-document paste-time selection.
- The chosen per-document mode is stored on the document so later settings changes do not alter queued or paused behavior.
- Review mode creates a first-class awaiting-review document state.
- While awaiting review, the user can edit title and markdown, approve and continue, rerun markdownify from raw content, cancel or archive the document, or switch the document to Auto and continue.
- Approval after review continues the pipeline from chunking.

### Markdown, Editing, and Versioning

- Markdownification returns a structured title and markdown result.
- Markdownification must be loss-preserving. It may clean formatting, add headings, normalize lists and tables, and remove obvious duplicated boilerplate when appropriate, but it must not summarize away details, change meaning, invent facts, or omit caveats.
- Summaries are produced during structured extraction, not during markdownification.
- Users can edit AI-generated markdown.
- Editing markdown creates a dirty state and does not automatically regenerate derived data.
- Reprocessing is explicit.
- Raw content remains unchanged unless the user deletes it.
- The system stores markdown version history.
- Only the current markdown version participates in active search, chat, and graph data.
- Reprocessing preserves markdown versions but deletes and recreates derived chunks, embeddings, AI tags, and graph edges for the active document version.

### Chunking and Embeddings

- Chunking is markdown-aware and follows headings, paragraphs, lists, tables, and code blocks before falling back to token limits.
- Default target chunk size is 700 tokens.
- Default soft max chunk size is 900 tokens.
- Default overlap is 100 tokens.
- Chunks use contextual overlap with heading metadata and lightweight heading prefixes for standalone meaning.
- Chunks store character offsets against the markdown version text.
- Chunks store chunk index, heading path, content hash, start and end offsets, and embedding metadata.
- Embeddings are generated in batches with configurable batch size.
- Embedding retries can fall back to smaller batches.
- Each chunk stores embedding model, embedding dimension, embedding task type, and embedded timestamp.
- Embedding task types distinguish document embeddings from query embeddings where supported by the provider.

### Structured Extraction

- Structured extraction runs after markdownification and chunking/embedding as part of the ingestion pipeline.
- Extraction produces summary, AI tags, entities, and knowledge triples.
- Extraction output is validated with shared schemas before storage.
- Malformed extraction output is retried rather than stored.
- If retries fail, the document enters a failed state with a validation-specific error code.
- The extraction prompt is biased by the project extraction profile and optional custom instructions.

### Tags

- Tags are normalized in dedicated tag tables.
- AI-generated tags and user-managed tags are tracked separately by source.
- The UI can display combined tags while preserving provenance.
- User tags are never overwritten by reprocessing.
- AI tags are replaced on each successful extraction for the current document version.
- Tags support filtering, autocomplete, renaming, and future tag pages.

### Entity Types and Graph Predicates

- The global entity type enum is shared across all projects.
- Entity types include person, organization, company, tool, technology, project, document, concept, topic, place, event, task, decision, metric, activity, habit, goal, resource, method, and other.
- The enum supports work, research, learning, and personal tracking use cases such as exercise, body weight, habits, goals, and metrics.
- Project profiles bias which entity types Gemini should prioritize but do not change the enum.
- Triple predicates use a controlled enum plus optional original free-form predicate text.
- Initial predicate options include mentions, related_to, uses, depends_on, part_of, created_by, owned_by, works_at, located_in, decided, requires, and blocks.
- Gemini must choose related_to when no specific predicate fits.

### Knowledge Graph

- Knowledge graph entities are project-scoped.
- Entity uniqueness is based on project, normalized name, and type.
- Entity normalization is deterministic and light: lowercase, trim, collapse punctuation and whitespace, and strip common legal suffixes for companies.
- Display names are stored separately from normalized names.
- v1 does not use LLM-based entity resolution.
- Graph edges store source document, source markdown version, predicate enum, optional predicate text, confidence, and source chunk where available.
- The graph view supports entity nodes and document nodes.
- Default graph view is entity-focused, with document nodes available by toggle.
- Document-to-entity mentions links can be displayed.
- Graph views support filters by entity type, predicate, tag, date, document, and project scope.
- Graph queries limit node count by default to avoid unusable dense graphs.
- Cross-project linking is soft in v1: project-scoped entities can be grouped in cross-project views by normalized name and type, but no hard global entity merge occurs.
- Future user-confirmed aliases or merges are out of scope for v1.

### Search and Retrieval

- Search defaults to the current project only.
- Users can change search/chat scope to selected projects or all projects.
- Archived projects are excluded from default scopes.
- Search returns chunk-level matches with document and project metadata.
- The UI groups chunk results by document.
- Search combines semantic vector search and Postgres full-text search.
- Hybrid ranking uses Reciprocal Rank Fusion.
- Search filters include project scope, tags, entity names, entity types, date range, document status, and limit or top-K.
- The frontend exposes common filters first, with advanced filters available as the interface matures.
- Embeddings are stored only for chunks in v1.

### Chat and Citations

- Chat is grounded-only by default.
- The assistant should answer from retrieved knowledge base content and cite stored sources.
- If the knowledge base lacks enough information, the assistant should say so.
- Any future general-knowledge mode must be explicit and clearly labeled.
- Chat conversations are persisted.
- Chat threads have a default scope.
- Each user message stores the actual scope snapshot used for retrieval.
- Each assistant response stores retrieved chunk IDs, graph context used, citations, model settings, answer text, and completion status.
- Chat uses retrieved chunks as primary context.
- Relevant graph context may be included when tied to retrieved entities.
- Graph facts must remain secondary context and should not become unsupported truth.
- Citations are chunk-level in v1.
- Citation payloads include document title, source metadata when available, markdown version, chunk, heading path, offsets, and snippet.
- Chat responses stream over SSE.
- The server buffers streamed assistant text and persists the final assistant message when generation completes.
- Chat streaming uses a dedicated stream per assistant response.
- Streaming uses a two-step flow: create the user message and pending assistant response first, then connect to a dedicated GET stream.
- Basic reconnect behavior is supported: reconnect while active if possible, or return the final assistant message if already complete.

### Events and Live Status

- Ingestion status uses Redis or BullMQ-backed live events.
- Postgres remains the source of truth for status.
- The worker updates Postgres at each stage and publishes status events.
- On SSE connect, the backend first sends current database state, then streams live updates.
- Project-level ingestion event stream is implemented first.
- Document-level and global streams can be added if cheap or when needed.
- Chat streaming is separate from ingestion/project status streams.

### API and Contract Decisions

- The API is REST JSON under a common API prefix.
- Fastify routes validate requests and responses with shared Zod schemas.
- The frontend uses a simple typed fetch client.
- No OpenAPI generation is required for v1.
- API route categories include projects, documents, document versions, ingestion actions, search, graph, chat, tags, settings, and event streams.
- Backend API routes return stable DTOs rather than raw database rows.
- Shared schemas define enums, request DTOs, response DTOs, extraction output, event payloads, and frontend-facing types.
- Database schema definitions remain backend-only and are not exported as frontend contracts.

### Frontend UX Decisions

- The app opens the last opened project when available.
- If no last project exists, the app shows a compact project dashboard.
- The main app uses a project workspace layout with left navigation, main content, and project-level actions.
- Primary views include Documents, Search, Chat, Graph, and Settings.
- The UI should feel like a quiet, dense, work-focused tool, not a marketing site.
- The first screen should be useful, not a landing page.
- Document detail uses tabs for Markdown, Raw, Summary, Entities, and Chunks.
- Markdown editing uses a simple split editor and preview.
- Markdown rendering supports GitHub-flavored markdown.
- Raw HTML inside markdown is not rendered.
- Markdown preview is sanitized.
- The Raw tab is unavailable or clearly marked when raw source content has been deleted.
- The Chunks tab is useful for development, debugging, and citation inspection.

### Settings and Preferences

- Durable app settings live in Postgres.
- Client-only UI preferences live in local storage.
- Global settings include default ingestion mode and visible AI configuration values.
- Local storage can store sidebar state, active tabs, and other non-critical UI preferences.
- Last opened project is stored durably and can also be cached client-side for quick routing.

### Status, Errors, and Retry Behavior

- Documents have stage-aware status.
- Core statuses include queued, processing, awaiting_review, ready, failed, dirty, deleted, and needs_reprocess where applicable.
- Pipeline stages include markdownify, review, chunk, embed, extract, graph, and complete.
- Failed documents keep successful partial outputs visible when useful.
- Error fields include machine-readable error code and user-readable message.
- Key error codes include quota_exceeded, model_error, validation_failed, embedding_failed, database_error, and unknown_error.
- v1 retry can rerun the full pipeline after cleaning derived artifacts for the document.
- Stage-specific retry can be added later.

### Security and Local Access

- v1 is a single-user local app with no authentication.
- Services bind to localhost by default unless explicitly configured otherwise.
- Gemini secrets are backend-only.
- Markdown preview is sanitized and raw HTML is disabled.
- CORS is minimized by using a Vite proxy in development and same-origin serving in production.

### Testing and Quality

- Unit tests cover schema validation, entity normalization, chunking, hash generation, and RRF ranking.
- Integration tests cover API CRUD flows, ingestion status transitions, worker behavior, search queries, chat persistence, and graph queries.
- Docker smoke tests verify that Postgres, Redis, API, worker, and frontend can start together.
- AI provider calls should be abstracted enough to allow mocked provider tests.
- Worker tests should verify retry, quota failure, and derived-data cleanup behavior.

### Observability and Operations

- The backend and worker use structured logs with request IDs, job IDs, document IDs, and project IDs.
- The API exposes health and readiness checks.
- Worker job status is visible in document status and event streams.
- README documentation includes Docker commands, privacy warning, backup and restore commands, troubleshooting, reset steps, and the ingestion pipeline explanation.
- Built-in backup UI is out of scope for v1.
