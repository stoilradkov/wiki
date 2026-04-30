# Phase 5 - Polish, Operations, and Hardening

Goal: make the app stable, explainable, and comfortable to run locally.

This phase implements production Docker mode, health checks, project archive/hard-delete flows, last project behavior, raw-source deletion, chat reconnect, user tag management, document trash, consistent errors, privacy and backup docs, tests, smoke checks, and structured logging.

## Epic 1 - Docker-First Platform and Monorepo

### Story 1.3 - Run the App in Production-Like Docker Mode

**Description:** As a self-hosting user, I want a production-like Docker mode so that I can run wiki locally as a stable app.

**Phase:** 5

**Dependencies:** Stories 1.1, 1.2, 14.1.

**Acceptance Criteria:**

- Production Compose starts Postgres, Redis, app/API, and worker.
- The backend serves the built frontend.
- The backend and worker share the same built backend image.
- A migration step runs before API and worker readiness.
- The app exposes a single primary web port.
- Runtime configuration is driven by environment variables.

### Story 1.4 - Provide Health and Readiness Checks

**Description:** As an operator, I want health and readiness checks so that Docker and users can tell whether services are running correctly.

**Phase:** 5

**Dependencies:** Story 1.3.

**Acceptance Criteria:**

- The API exposes a health check that verifies the process is alive.
- The API exposes a readiness check that verifies required dependencies.
- Readiness includes database and Redis connectivity.
- Production containers use these checks where practical.
- Failed readiness provides useful logs.

## Epic 3 - Projects and App Settings

### Story 3.2 - Archive and Restore Projects

**Description:** As a user, I want to archive projects so that inactive work is hidden without losing data.

**Phase:** 5

**Dependencies:** Story 3.1.

**Acceptance Criteria:**

- Users can archive a project.
- Archived projects are hidden from normal navigation by default.
- Archived projects are excluded from search, chat, and graph scopes by default.
- Users can view archived projects in a management area.
- Users can restore an archived project.

### Story 3.3 - Hard Delete Projects

**Description:** As a user, I want an explicit hard-delete path for projects so that I can permanently remove a project and all its data.

**Phase:** 5

**Dependencies:** Story 3.2.

**Acceptance Criteria:**

- Hard delete is separated from archive in a danger-zone flow.
- The user must confirm the destructive action.
- Hard delete cascades project-scoped documents, versions, chunks, graph data, tags, chat threads, and settings.
- Hard-deleted project data no longer appears in any API response.
- The operation logs a clear success or failure event.

### Story 3.5 - Open the Last Project by Default

**Description:** As a user, I want the app to reopen my last project so that I can resume work quickly.

**Phase:** 5

**Dependencies:** Stories 3.1, 3.4.

**Acceptance Criteria:**

- If a last opened project exists and is not archived, the app opens it on launch.
- If no valid last project exists, the app shows a compact project dashboard.
- Opening a project updates the stored last project.
- Archived projects are not auto-opened unless restored.

## Epic 6 - Markdown Editing, Versions, and Raw Content

### Story 6.4 - Delete Raw Source Content

**Description:** As a user, I want to delete raw source content after processing so that I can reduce retained sensitive data.

**Phase:** 5

**Dependencies:** Stories 6.2, 6.3.

**Acceptance Criteria:**

- The user can physically remove raw content from Postgres.
- Raw deletion records a timestamp.
- Markdown versions remain intact.
- Search, chat, graph, and reprocess-from-markdown still work.
- Rerun-markdownify-from-raw is disabled after raw deletion.

## Epic 8 - Chat, Retrieval, Streaming, and Citations

### Story 8.6 - Support Basic Chat Stream Reconnect

**Description:** As a user, I want a refresh during streaming to recover gracefully so that I do not lose the answer.

**Phase:** 5

**Dependencies:** Story 8.5.

**Acceptance Criteria:**

- Assistant messages have streaming, complete, or failed status.
- If a stream is active, reconnecting by stream identifier attempts to continue.
- If a stream is complete, reconnect returns the final answer.
- If a stream failed, the UI shows failure and retry affordance.
- Token-level replay is not required in v1.

## Epic 9 - Structured Extraction, Tags, and Entities

### Story 9.4 - Manage User Tags

**Description:** As a user, I want to add and edit my own tags so that AI extraction does not overwrite my organization.

**Phase:** 5

**Dependencies:** Story 9.3.

**Acceptance Criteria:**

- Users can add user tags to documents.
- Users can remove user tags from documents.
- User tags are visually distinguishable from AI tags where useful.
- Tag autocomplete is available once tags exist.
- User tags survive document reprocessing.

## Epic 12 - Deletion, Restore, and Retention

### Story 12.1 - Soft Delete Documents

**Description:** As a user, I want deleted documents to go to trash first so that accidental deletions are recoverable.

**Phase:** 5

**Dependencies:** Stories 6.3, 10.1.

**Acceptance Criteria:**

- Users can soft-delete a document.
- Soft-deleted documents are excluded from search, chat, graph, and normal lists.
- Soft delete immediately removes derived chunks, embeddings, AI tags, and graph edges.
- The document metadata and markdown versions remain restorable.
- Deleted documents can be viewed in trash.

### Story 12.2 - Restore Documents

**Description:** As a user, I want to restore deleted documents so that accidental deletion does not destroy work.

**Phase:** 5

**Dependencies:** Story 12.1.

**Acceptance Criteria:**

- Users can restore a soft-deleted document.
- Restored documents are marked as needing reprocess.
- Restored documents do not automatically recreate derived data without user action.
- Markdown versions remain available after restore.
- The UI explains that reprocessing is needed before search/chat/graph use.

### Story 12.3 - Empty Trash

**Description:** As a user, I want to permanently delete trashed documents so that I can remove unwanted data.

**Phase:** 5

**Dependencies:** Stories 12.1, 12.2.

**Acceptance Criteria:**

- Empty trash hard-deletes trashed documents.
- Hard deletion removes document metadata, markdown versions, retained raw content, and any remaining derived data.
- The user must confirm the destructive action.
- Hard-deleted documents cannot be restored.
- The operation excludes non-deleted documents.

## Epic 13 - Error Handling, Quotas, and Configuration

### Story 13.3 - Surface Consistent Errors

**Description:** As a user, I want understandable errors so that I know what action to take next.

**Phase:** 5

**Dependencies:** Stories 5.7, 13.2.

**Acceptance Criteria:**

- API errors return machine-readable code and user-readable message.
- Known errors include quota, model, validation, embedding, database, and unknown.
- Failed jobs persist error details.
- Frontend displays actionable messages.
- Retry actions are shown only when valid.

## Epic 14 - Security, Privacy, and Documentation

### Story 14.2 - Bind Locally by Default

**Description:** As a local self-hosting user, I want services to bind locally by default so that the app is not accidentally exposed on my network.

**Phase:** 5

**Dependencies:** Stories 1.2, 1.3.

**Acceptance Criteria:**

- Default configuration binds the app to localhost where practical.
- Documentation explains how to change binding intentionally.
- No authentication is included in v1.
- The README explains the single-user local assumption.

### Story 14.3 - Document Privacy Tradeoffs

**Description:** As a user, I want clear privacy documentation so that I understand what leaves my machine.

**Phase:** 5

**Dependencies:** Story 14.1.

**Acceptance Criteria:**

- README explains that app infrastructure and data storage are local.
- README explains that Gemini calls send content to Google.
- README includes a warning about Gemini free-tier data usage.
- README recommends paid-tier or alternate provider considerations for sensitive data.
- Setup docs mention that the API key is backend-only.

### Story 14.4 - Provide Backup and Restore Guidance

**Description:** As a self-hosting user, I want backup guidance so that I can protect my local knowledge base.

**Phase:** 5

**Dependencies:** Story 1.3.

**Acceptance Criteria:**

- README documents how to back up Docker volumes.
- README documents how to restore from a backup.
- README documents reset behavior.
- Built-in backup UI is explicitly out of scope for v1.

## Epic 15 - Testing and Quality Gates

### Story 15.1 - Unit Test Core Logic

**Description:** As a developer, I want unit tests for critical pure logic so that regressions are caught quickly.

**Phase:** 5

**Dependencies:** Stories 7.1, 7.4, 9.5.

**Acceptance Criteria:**

- Chunking behavior is unit tested.
- Entity normalization is unit tested.
- Schema validation is unit tested.
- Raw and markdown hash generation are unit tested.
- Reciprocal Rank Fusion ranking is unit tested.

### Story 15.2 - Integration Test API and Worker Flows

**Description:** As a developer, I want integration tests for API and worker workflows so that core product flows work against real services.

**Phase:** 5

**Dependencies:** Stories 5.7, 7.4, 10.2.

**Acceptance Criteria:**

- Project and document CRUD flows are tested.
- Paste-to-queued-document flow is tested.
- Ingestion status transitions are tested with a mocked AI provider.
- Reprocess cleanup behavior is tested.
- Search and graph API behavior is tested where practical.

### Story 15.3 - Smoke Test Docker Startup

**Description:** As a developer, I want a Docker smoke test so that the documented startup path stays healthy.

**Phase:** 5

**Dependencies:** Stories 1.3, 1.4.

**Acceptance Criteria:**

- Dev or production Compose can start required services.
- API health and readiness endpoints respond.
- Frontend is reachable.
- Worker can connect to Redis and Postgres.
- Failure output is easy to diagnose.

### Story 15.4 - Add Structured Logging

**Description:** As a developer, I want structured logs so that pipeline and API failures can be traced.

**Phase:** 5

**Dependencies:** Stories 5.1, 13.3.

**Acceptance Criteria:**

- API logs include request identifiers.
- Worker logs include job, document, and project identifiers.
- AI provider failures include provider and task context without logging secrets.
- Status transitions are logged.
- Logs are readable in Docker output.
