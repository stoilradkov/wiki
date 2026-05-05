# Phase 2 - Ingestion and Review

Goal: make documents flow through the first useful AI ingestion loop.

This phase implements async ingestion, Gemini markdownification, Auto and Review modes, status streaming, markdown editing, versioning, duplicate detection, and retry behavior.

## Epic 3 - Projects and App Settings

### Story 3.4 - Configure Global App Settings [Completed]

**Description:** As a user, I want global app settings so that defaults are durable across sessions.

**Phase:** 2

**Dependencies:** Stories 3.1, 13.1.

**Acceptance Criteria:**

- Global default ingestion mode is stored durably.
- Visible AI model configuration can be displayed without exposing secrets.
- Last opened project is stored durably.
- Settings changes apply to new documents and projects according to precedence rules.
- Client-only UI preferences remain in local storage.

## Epic 4 - Document Creation, Metadata, and Deduplication

### Story 4.3 - Detect Exact Duplicates [Completed]

**Description:** As a user, I want to be warned when I paste exact duplicate content so that I do not accidentally clutter a project.

**Phase:** 2

**Dependencies:** Story 4.1.

**Acceptance Criteria:**

- The system computes a raw content hash.
- Duplicate detection is scoped to the current project.
- Exact duplicate paste shows a warning with the matching document.
- The user can open the existing document, create anyway, or cancel.
- Duplicate detection is advisory and does not hard-block creation.

### Story 4.4 - Store Markdown Version Hashes [completed]

**Description:** As a developer, I want markdown versions to have hashes so that version comparison and future normalized duplicate detection are possible.

**Phase:** 2

**Dependencies:** Story 6.2.

**Acceptance Criteria:**

- Each markdown version stores a hash of its markdown content.
- Hash generation is deterministic.
- Hashes are available for idempotency checks during reprocessing.
- Raw content hash is preserved even if raw content is later deleted.

## Epic 5 - Ingestion Pipeline and Status

### Story 5.1 - Process Documents Asynchronously [completed]

**Description:** As a user, I want ingestion to run in the background so that pasting content does not block the UI.

**Phase:** 2

**Dependencies:** Stories 1.2, 4.1, 13.1.

**Acceptance Criteria:**

- The API creates a document and returns immediately.
- A BullMQ job processes the document asynchronously.
- Worker concurrency defaults to one.
- Worker concurrency is configurable.
- Job progress is reflected in document status and stage.

### Story 5.2 - Markdownify Raw Content [completed]

**Description:** As a user, I want pasted text cleaned into structured markdown so that my wiki remains readable and organized.

**Phase:** 2

**Dependencies:** Stories 5.1, 14.1.

**Acceptance Criteria:**

- Gemini returns a suggested title and markdown body.
- Markdownification is loss-preserving.
- Markdownification does not summarize away source details.
- The generated title is used when the user did not provide one.
- Markdown output creates or updates the current markdown version according to workflow.

### Story 5.3 - Support Auto Ingestion Mode [completed]

**Description:** As a user, I want trusted content to process automatically so that it becomes searchable quickly.

**Phase:** 2

**Dependencies:** Stories 5.1, 5.2, 5.5.

**Acceptance Criteria:**

- Auto mode is available as the default ingestion mode.
- Auto mode continues from markdownify through chunking, embedding, extraction, and graph update without user approval.
- The document reaches ready status when all stages succeed.
- Stage transitions are visible in the UI.

### Story 5.4 - Support Review Ingestion Mode [completed]

**Description:** As a user, I want important documents to pause after markdownification so that I can review AI output before indexing it.

**Phase:** 2

**Dependencies:** Stories 5.1, 5.2, 5.5, 6.1.

**Acceptance Criteria:**

- Review mode pauses after markdownification.
- The document enters awaiting-review status.
- The user can edit title and markdown before approving.
- Approving continues ingestion from chunking.
- The user can rerun markdownify from raw content if raw content still exists.

### Story 5.5 - Resolve Ingestion Mode Precedence [completed]

**Description:** As a user, I want ingestion mode defaults to be flexible so that each project and document can behave appropriately.

**Phase:** 2

**Dependencies:** Stories 3.1, 3.4, 4.1.

**Acceptance Criteria:**

- Global default ingestion mode exists.
- Project-level ingestion mode can inherit or override the global default.
- Paste-time document mode defaults from the resolved project/global setting.
- The user can override mode for a specific pasted document.
- The selected document mode is stored on the document.

### Story 5.6 - Stream Ingestion Status [completed]

**Description:** As a user, I want live ingestion feedback so that I know what the system is doing with my document.

**Phase:** 2

**Dependencies:** Stories 5.1, 5.2.

**Acceptance Criteria:**

- Worker stage updates are stored in Postgres.
- Worker stage updates are published through Redis or BullMQ events.
- A project-level SSE stream sends current state on connect.
- The same stream sends live updates after connection.
- Missed events can be recovered from database state.

### Story 5.7 - Handle Pipeline Failures

**Description:** As a user, I want clear failure states and retry options so that model or quota issues do not leave documents mysterious.

**Phase:** 2

**Dependencies:** Stories 5.1, 5.6, 13.2.

**Acceptance Criteria:**

- Failed documents store error code and user-readable message.
- Successful partial outputs remain visible where useful.
- Quota errors are distinguished from validation, model, embedding, and database errors.
- The UI shows retry options.
- v1 retry can clean derived data and rerun the full pipeline.

## Epic 6 - Markdown Editing, Versions, and Raw Content

### Story 6.1 - Edit Markdown in a Split View [completed]

**Description:** As a user, I want a simple markdown editor with preview so that I can improve AI-generated content before or after indexing.

**Phase:** 2

**Dependencies:** Stories 5.2, 11.2, 11.4.

**Acceptance Criteria:**

- The document detail Markdown tab has an editor and preview.
- The preview supports GitHub-flavored markdown.
- Raw HTML inside markdown is not rendered.
- Preview output is sanitized.
- Unsaved edits show a dirty state.

### Story 6.2 - Preserve Markdown Version History [completed]

**Description:** As a user, I want markdown versions preserved so that I can audit changes to canonical content.

**Phase:** 2

**Dependencies:** Stories 5.2, 6.1.

**Acceptance Criteria:**

- Saving edited markdown creates a new version.
- Documents point to one current markdown version.
- Previous markdown versions remain available for inspection.
- Only the current version participates in active search, chat, and graph data.
- Markdown version metadata includes timestamps and hashes.

### Story 6.3 - Reprocess Current Markdown Explicitly [completed]

**Description:** As a user, I want to explicitly reprocess edited markdown so that derived search and graph data update only when I choose.

**Phase:** 2

**Dependencies:** Stories 5.1, 6.1, 6.2.

**Acceptance Criteria:**

- Editing markdown marks derived data as dirty or stale.
- Reprocessing is triggered by a user action.
- Reprocessing deletes and recreates chunks, embeddings, AI tags, and graph edges for the document.
- User tags are preserved.
- Reprocessing acts on the current markdown version.

## Epic 11 - Document Detail and Workspace UI

### Story 11.2 - View Document Tabs [completed]

**Description:** As a user, I want document tabs so that I can inspect canonical content, raw source, and derived data separately.

**Phase:** 2

**Dependencies:** Stories 4.1, 11.1.

**Acceptance Criteria:**

- Document detail includes Markdown, Raw, Summary, Entities, and Chunks tabs.
- Markdown is the primary tab.
- Raw tab shows source content when retained.
- Raw tab clearly indicates when raw source was deleted.
- Chunks tab shows chunk metadata useful for debugging and citations.

### Story 11.3 - Show Pipeline Status in the UI [completed]

**Description:** As a user, I want document status visible wherever documents appear so that I understand whether content is ready.

**Phase:** 2

**Dependencies:** Stories 5.1, 5.6.

**Acceptance Criteria:**

- Document lists show status.
- Document detail shows current stage and error message when applicable.
- Awaiting-review documents are clearly actionable.
- Failed documents show retry actions.
- Ready documents are eligible for search, chat, and graph.

### Story 11.4 - Render Sanitized Markdown

**Description:** As a user, I want markdown previews to render common formatting safely so that documents are readable without creating avoidable security risks.

**Phase:** 2

**Dependencies:** Story 6.1.

**Acceptance Criteria:**

- GitHub-flavored markdown is supported.
- Tables, task lists, and standard markdown formatting render.
- Raw HTML is not rendered.
- Rendered output is sanitized.
- The preview handles AI-generated markdown gracefully.

## Epic 13 - Error Handling, Quotas, and Configuration

### Story 13.2 - Respect Rate Limits with Backoff

**Description:** As a user, I want the ingestion worker to handle Gemini rate limits gracefully so that temporary quota pressure does not corrupt documents.

**Phase:** 2

**Dependencies:** Stories 5.1, 13.1.

**Acceptance Criteria:**

- Transient model errors retry with exponential backoff.
- Quota errors are detected and labeled separately.
- Exhausted retries mark the document failed with a quota-specific error when appropriate.
- The UI offers retry later.
- Logs include enough context to diagnose the affected job and document.
