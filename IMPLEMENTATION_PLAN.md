# wiki Implementation Plan

This plan organizes the backlog into implementation phases for AI agents and developers. The root PRD links to phase-scoped PRD files, and those PRD files remain the product and architecture source of truth for each phase. The story phase files contain actionable user stories with acceptance criteria.

## Phase 1 - Foundation

Goal: create the working skeleton of the local Docker app.

Build the monorepo, shared contracts, Docker development environment, database foundation, project CRUD, document paste creation, basic workspace navigation, configurable AI settings, and backend-only secret handling.

Exit criteria:

- The app starts in Docker dev mode.
- Frontend, backend, worker, Postgres, and Redis are wired.
- Projects can be created and listed.
- Pasted text creates a queued document.
- Shared DTOs and validation are in place.
- AI settings and secrets are configured but full ingestion can still be mocked.

Detailed stories: [Phase 1 - Foundation](stories/phase-1-foundation.md)
Phase PRD: [Phase 1 PRD](docs/prd/phase-1-foundation.md)

## Phase 2 - Ingestion and Review

Goal: make documents flow through the first useful AI ingestion loop.

Build async worker processing, markdownification, Auto and Review modes, markdown editing, versioning, duplicate detection, status streaming, and retry behavior.

Exit criteria:

- Auto mode can markdownify and continue through mocked or partial downstream stages.
- Review mode pauses after markdownification and resumes after approval.
- Markdown versions are created and edited.
- Document status updates stream to the frontend.
- Failures show meaningful error state and retry affordance.

Detailed stories: [Phase 2 - Ingestion and Review](stories/phase-2-ingestion-review.md)
Phase PRD: [Phase 2 PRD](docs/prd/phase-2-ingestion-review.md)

## Phase 3 - Search and Chat

Goal: make the knowledge base searchable and conversational.

Build semantic chunking, Gemini embeddings, full-text search, hybrid ranking, persisted chat threads, retrieval, grounded answer generation, SSE chat streaming, and chunk-level citations.

Exit criteria:

- Ready documents are chunked and embedded.
- Hybrid search returns grouped chunk results.
- Chat persists threads and messages.
- Chat streams answers through a dedicated SSE endpoint.
- Assistant answers cite source chunks and stay grounded in retrieved content.

Detailed stories: [Phase 3 - Search and Chat](stories/phase-3-search-chat.md)
Phase PRD: [Phase 3 PRD](docs/prd/phase-3-search-chat.md)

## Phase 4 - Structure and Graph

Goal: extract structure from documents and make relationships explorable.

Build structured extraction, profile-biased prompts, normalized tags, entity normalization, graph nodes and edges, graph query API, graph visualization data, relevant graph context for chat, and soft cross-project entity linking.

Exit criteria:

- Extraction validates summaries, tags, entities, and triples before storage.
- AI tags and user tags are separated.
- Project-scoped entities and relationships are stored.
- Graph API returns filtered nodes and links.
- Graph context can assist chat when relevant.

Detailed stories: [Phase 4 - Structure and Graph](stories/phase-4-structure-graph.md)
Phase PRD: [Phase 4 PRD](docs/prd/phase-4-structure-graph.md)

## Phase 5 - Polish, Operations, and Hardening

Goal: make the app stable, explainable, and comfortable to run locally.

Build production Docker mode, health checks, archive/delete/restore flows, raw-content deletion, chat reconnect behavior, user tag management, tests, structured logging, privacy docs, backup docs, and startup smoke tests.

Exit criteria:

- Production Compose runs the built app.
- Deletion, restore, archive, and hard-delete flows behave safely.
- Raw source content can be physically removed.
- Critical logic and integration paths are tested.
- README covers setup, privacy, backup, restore, and troubleshooting.

Detailed stories: [Phase 5 - Polish, Operations, and Hardening](stories/phase-5-polish-ops.md)
Phase PRD: [Phase 5 PRD](docs/prd/phase-5-polish-ops.md)

## Cross-Phase Rules

- Keep `PRD.md` and the relevant `docs/prd/phase-*` file current when product or architecture decisions change.
- Keep story IDs stable even if story text is refined.
- Prefer vertical slices that leave the app runnable after each story group.
- Use mocked AI provider behavior for early integration tests where real Gemini calls would be slow, costly, or flaky.
- Do not expose Gemini secrets to the frontend.
- Preserve local-first infrastructure assumptions unless the PRD is explicitly changed.
