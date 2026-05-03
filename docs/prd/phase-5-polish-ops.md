# Phase 5 PRD - Polish, Operations, and Hardening

Goal: make the app stable, explainable, and comfortable to run locally.

Use with `stories/phase-5-polish-ops.md`.

## Phase Scope

Phase 5 implements production Docker mode, health checks, project archive/hard-delete flows, last project behavior, raw-source deletion, chat reconnect, user tag management, document trash, consistent errors, privacy and backup docs, tests, smoke checks, and structured logging.

## Relevant Cross-Phase Context

- Phase 1 provides Docker dev mode, project CRUD, document creation, settings, and secret handling.
- Phase 2 provides ingestion status, markdown versions, reprocess behavior, duplicate hashes, raw retention, and retry behavior.
- Phase 3 provides chunking, embeddings, search, persisted chat, chat streaming, and citations.
- Phase 4 provides tags, entities, graph edges, graph queries, and graph-assisted chat.

## Production Docker and Runtime

- Production mode uses built containers and a single web entry point.
- Production Compose starts Postgres, Redis, app/API, and worker.
- Backend serves the built frontend static assets.
- Backend API and ingestion worker are separate services but share the same built backend image.
- A production migration step runs before the API and worker become ready.
- Runtime configuration is driven by environment variables.
- The app exposes a single primary web port.
- Dev mode remains hot-reload friendly.

## Health and Readiness

- The API exposes a health check that verifies the process is alive.
- The API exposes a readiness check that verifies required dependencies.
- Readiness includes database and Redis connectivity.
- Production containers use these checks where practical.
- Failed readiness provides useful logs.

## Project Archive, Restore, and Hard Delete

- Projects use archive as the normal removal flow.
- Users can archive a project.
- Archived projects are hidden from normal navigation by default.
- Archived projects are excluded from search, chat, and graph scopes by default.
- Users can view archived projects in a management area.
- Users can restore an archived project.
- Hard delete is separated from archive in a danger-zone flow.
- The user must confirm the destructive action.
- Hard delete cascades project-scoped documents, versions, chunks, graph data, tags, chat threads, and settings.
- Hard-deleted project data no longer appears in any API response.
- The operation logs clear success or failure event.

## Last Project Behavior

- The app opens the last opened project when available.
- If a last opened project exists and is not archived, the app opens it on launch.
- If no valid last project exists, the app shows a compact project dashboard.
- Opening a project updates the stored last project.
- Archived projects are not auto-opened unless restored.
- Last opened project is stored durably and can also be cached client-side for quick routing.

## Raw Source Deletion

- Raw pasted content is stored by default as immutable provenance.
- Users can physically remove raw source content from Postgres per document while keeping markdown versions and derived knowledge.
- Raw deletion records a deletion timestamp.
- Raw content hash is preserved for deduplication.
- Markdown versions remain intact.
- Search, chat, graph, and reprocess-from-markdown still work.
- Rerun-markdownify-from-raw is disabled after raw deletion.
- Raw tab is unavailable or clearly marked when raw source content has been deleted.

## Document Trash, Restore, and Hard Delete

- Document deletion is soft delete first.
- Users can soft-delete a document.
- Soft-deleted documents are excluded from search, chat, graph, and normal lists.
- Soft delete immediately removes derived chunks, embeddings, AI tags, and graph edges so deleted content does not appear in search, chat, or graph views.
- The document metadata and markdown versions remain restorable.
- Deleted documents can be viewed in trash.
- Restoring a soft-deleted document marks it as needing reprocess.
- Restored documents do not automatically recreate derived data without user action.
- The UI explains that reprocessing is needed before search/chat/graph use.
- Empty trash performs hard deletion.
- Empty trash removes document metadata, markdown versions, retained raw content, and any remaining derived data.
- Hard-deleted documents cannot be restored.
- Empty trash excludes non-deleted documents and requires confirmation.

## Chat Stream Reconnect

- Chat responses stream over SSE through a dedicated stream per assistant response.
- Assistant messages have streaming, complete, or failed status.
- If a stream is active, reconnecting by stream identifier attempts to continue.
- If a stream is complete, reconnect returns the final answer.
- If a stream failed, the UI shows failure and retry affordance.
- Token-level replay is not required in v1.

## User Tags

- AI-generated tags and user-managed tags are tracked separately by source.
- Users can add user tags to documents.
- Users can remove user tags from documents.
- User tags are visually distinguishable from AI tags where useful.
- Tag autocomplete is available once tags exist.
- User tags are never overwritten by reprocessing.
- User tags survive document reprocessing.
- Tags support filtering, autocomplete, renaming, and future tag pages.

## Consistent Errors

- API errors return machine-readable code and user-readable message.
- Known errors include quota_exceeded, model_error, validation_failed, embedding_failed, database_error, and unknown_error.
- Failed jobs persist error details.
- Frontend displays actionable messages.
- Retry actions are shown only when valid.
- Failed documents keep successful partial outputs visible when useful.
- v1 retry can rerun the full pipeline after cleaning derived artifacts for the document.

## Security and Privacy Docs

- v1 is a single-user local app with no authentication.
- Services bind to localhost by default unless explicitly configured otherwise.
- Default configuration binds the app to localhost where practical.
- Documentation explains how to change binding intentionally.
- Gemini secrets are backend-only.
- Markdown preview is sanitized and raw HTML is disabled.
- CORS is minimized by using a Vite proxy in development and same-origin serving in production.
- README explains that app infrastructure and data storage are local.
- README explains that Gemini calls send content to Google.
- README documents the Gemini free tier as acceptable for development and non-sensitive usage.
- README includes warning that Gemini free-tier usage may be used by Google to improve products.
- README recommends paid-tier or alternate provider considerations for sensitive data.
- Setup docs mention that the API key is backend-only.

## Backup and Restore Docs

- README documents how to back up Docker volumes.
- README documents how to restore from a backup.
- README documents reset behavior.
- Built-in backup UI is explicitly out of scope for v1.

## Testing and Quality

- Unit tests cover schema validation, entity normalization, chunking, hash generation, and RRF ranking.
- Integration tests cover API CRUD flows, ingestion status transitions, worker behavior, search queries, chat persistence, and graph queries.
- Docker smoke tests verify that Postgres, Redis, API, worker, and frontend can start together.
- AI provider calls should be abstracted enough to allow mocked provider tests.
- Worker tests verify retry, quota failure, and derived-data cleanup behavior.
- Dev or production Compose can start required services.
- API health and readiness endpoints respond.
- Frontend is reachable.
- Worker can connect to Redis and Postgres.
- Failure output is easy to diagnose.

## Observability and Operations

- The backend and worker use structured logs with request IDs, job IDs, document IDs, and project IDs.
- API logs include request identifiers.
- Worker logs include job, document, and project identifiers.
- AI provider failures include provider and task context without logging secrets.
- Status transitions are logged.
- Logs are readable in Docker output.
- Worker job status is visible in document status and event streams.
- README documentation includes Docker commands, privacy warning, backup and restore commands, troubleshooting, reset steps, and ingestion pipeline explanation.
- Built-in backup UI is out of scope for v1.

## Phase 5 Exit Context

By end of Phase 5, production Compose runs the built app, deletion/restore/archive/hard-delete flows behave safely, raw source content can be physically removed, critical logic and integration paths are tested, and README covers setup, privacy, backup, restore, and troubleshooting.
