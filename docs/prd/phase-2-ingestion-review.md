# Phase 2 PRD - Ingestion and Review

Goal: make documents flow through the first useful AI ingestion loop.

Use with `stories/phase-2-ingestion-review.md`.

## Phase Scope

Phase 2 implements async ingestion, Gemini markdownification, Auto and Review modes, markdown editing, versioning, duplicate detection, status streaming, and retry behavior.

## Relevant Cross-Phase Context

- Phase 1 provides projects, queued document creation, source metadata, shared enums, AI settings, worker runtime, and backend-only Gemini secrets.
- Phase 3 will consume current markdown versions, chunks, embeddings, status, and source metadata for search/chat/citations.
- Phase 4 will consume current markdown versions and chunk context for structured extraction, tags, entities, triples, and graph data.
- Phase 5 will add raw deletion, trash/restore, production hardening, and broader tests. Phase 2 should keep data models compatible with those flows.

## Ingestion Pipeline

- Pasting content creates a document immediately with durable queued status.
- A BullMQ job processes the document asynchronously.
- Worker concurrency defaults to 1 and is configurable.
- Worker updates Postgres at each stage.
- Worker stage updates are published through Redis or BullMQ events.
- Postgres remains the source of truth for document status.
- Pipeline stages include markdownify, review, chunk, embed, extract, graph, and complete.
- Core statuses include queued, processing, awaiting_review, ready, failed, dirty, deleted, and needs_reprocess where applicable.
- Auto mode may continue through mocked or partial downstream stages until Phase 3/4 implementations land.

## Markdownification

- Markdownification returns a structured title and markdown result.
- If the user did not provide a title, the generated title is used.
- Markdownification must be loss-preserving.
- It may clean formatting, add headings, normalize lists and tables, and remove obvious duplicated boilerplate when appropriate.
- It must not summarize away details, change meaning, invent facts, or omit caveats.
- Summaries are produced during structured extraction in Phase 4, not during markdownification.
- Markdown output creates or updates the current markdown version according to workflow.
- Raw content remains unchanged unless the user deletes it in Phase 5.

## Ingestion Modes and Review Workflow

- The app supports two ingestion modes: Auto and Review.
- Auto mode is the default: paste, markdownify, then continue automatically through the rest of the pipeline.
- Review mode is opt-in: paste, markdownify, pause for review, allow edits, then continue only after user confirmation.
- Ingestion mode exists at global default, project override, and per-document paste-time selection.
- The selected per-document mode is stored on the document so later settings changes do not alter queued or paused behavior.
- Global default ingestion mode is stored durably.
- Project-level ingestion mode can inherit or override the global default.
- Paste-time document mode defaults from the resolved project/global setting.
- Review mode creates a first-class awaiting-review document state.
- While awaiting review, the user can edit title and markdown, approve and continue, rerun markdownify from raw content, cancel or archive the document, or switch the document to Auto and continue.
- Approval after review continues the pipeline from chunking.

## Markdown Editing and Versioning

- The canonical editable content format is markdown.
- Users can edit AI-generated markdown.
- The document detail Markdown tab has an editor and preview.
- Editing markdown creates a dirty state and does not automatically regenerate derived data.
- Saving edited markdown creates a new version.
- The system stores markdown version history.
- Documents point to one current markdown version.
- Previous markdown versions remain available for inspection.
- Only the current markdown version participates in active search, chat, and graph data.
- Each markdown version stores deterministic markdown hash metadata for idempotency, version comparison, and future normalized duplicate detection.
- Reprocessing is explicit and acts on the current markdown version.
- Reprocessing preserves markdown versions but deletes and recreates derived chunks, embeddings, AI tags, and graph edges for the active document version.
- User tags are preserved on reprocess.

## Document Detail and Markdown Rendering

- Document detail uses tabs for Markdown, Raw, Summary, Entities, and Chunks.
- Markdown is the primary tab.
- Raw tab shows source content when retained.
- Raw tab is unavailable or clearly marked when raw source content has been deleted.
- Summary, Entities, and Chunks tabs may show empty or pending states until later phases produce those derived outputs.
- Chunks tab is useful for development, debugging, and citation inspection.
- Markdown rendering supports GitHub-flavored markdown.
- Raw HTML inside markdown is not rendered.
- Markdown preview is sanitized.
- Tables, task lists, and standard markdown formatting render.
- Preview handles AI-generated markdown gracefully.
- Unsaved edits show a dirty state.

## Duplicate Detection

- The system computes a hash of raw pasted content.
- Exact duplicate detection is scoped to project.
- When a duplicate is detected, the user can open the existing document, create anyway, or cancel.
- Duplicate detection is advisory, not a hard block.
- Markdown versions also store a markdown hash.
- Raw content hash is preserved even if raw content is later deleted.
- Document merge workflows are out of scope for v1.

## Status, Errors, and Retry

- Documents have stage-aware status.
- Document lists show status.
- Document detail shows current stage and error message when applicable.
- Awaiting-review documents are clearly actionable.
- Failed documents show retry actions.
- Ready documents are eligible for search, chat, and graph.
- Failed documents keep successful partial outputs visible when useful.
- Error fields include machine-readable error code and user-readable message.
- Key error codes include quota_exceeded, model_error, validation_failed, embedding_failed, database_error, and unknown_error.
- Transient model errors retry with exponential backoff.
- Quota errors are detected and labeled separately.
- Exhausted retries mark the document failed with a quota-specific error when appropriate.
- The UI offers retry later.
- v1 retry can rerun the full pipeline after cleaning derived artifacts for the document.
- Stage-specific retry can be added later.
- Logs include enough context to diagnose affected job and document.

## Events and Live Status

- Ingestion status uses Redis or BullMQ-backed live events.
- On SSE connect, the backend first sends current database state, then streams live updates.
- Project-level ingestion event stream is implemented first.
- Document-level and global streams can be added if cheap or when needed.
- Chat streaming is separate from ingestion/project status streams.
- Missed ingestion events can be recovered from database state.

## Phase 2 Exit Context

By end of Phase 2, Auto mode can markdownify and continue through mocked or partial downstream stages, Review mode pauses and resumes, markdown versions can be edited, status updates stream to frontend, and failures show meaningful state plus retry affordance.
