# Phase 3 PRD - Search and Chat

Goal: make the knowledge base searchable and conversational.

Use with `stories/phase-3-search-chat.md`.

## Phase Scope

Phase 3 implements semantic chunking, Gemini embeddings, full-text indexing, hybrid search, persisted chat threads, grounded retrieval, SSE chat streaming, and chunk-level citations.

## Relevant Cross-Phase Context

- Phase 1 provides projects, source metadata, shared contracts, AI configuration, backend-only Gemini secrets, and workspace navigation.
- Phase 2 provides current markdown versions, status flow, retry behavior, dirty/reprocess semantics, and sanitized document detail views.
- Phase 4 will add extraction, tags, entities, graph edges, and optional graph context for chat. Phase 3 search filters may include tag/entity fields before their UI is fully populated.
- Phase 5 will add chat reconnect behavior, deletion/restore flows, tests, and operational hardening.

## Chunking

- Ready documents are chunked from the current markdown version only.
- Chunking is markdown-aware and follows headings, paragraphs, lists, tables, and code blocks before falling back to token limits.
- Default target chunk size is 700 tokens.
- Default soft max chunk size is 900 tokens.
- Default overlap is 100 tokens.
- Chunks use contextual overlap with heading metadata and lightweight heading prefixes for standalone meaning.
- Chunks do not split code blocks or tables unless unavoidable.
- Chunks store character offsets against the markdown version text.
- Chunks store chunk index, heading path, content hash, start and end offsets, and embedding metadata.
- Reprocessing deletes and recreates chunks for the current markdown version.
- Soft-deleted documents will later immediately delete derived chunks, embeddings, and graph edges.

## Embeddings

- Embeddings use Gemini embedding model defaults.
- Default embedding model is gemini-embedding-002.
- Default embedding dimension is 768.
- Embeddings are generated in configurable batches.
- Embedding retries can fall back to smaller batches.
- Each chunk stores embedding model, embedding dimension, embedding task type, and embedded timestamp.
- Embedding task types distinguish document embeddings from query embeddings where supported by the provider.
- Gemini rate-limit and quota errors are handled with backoff, retries, visible failure states, and retry-later path.
- Gemini API keys remain backend-only.

## Full-Text and Hybrid Search

- Search defaults to the current project only.
- Users can change search/chat scope to selected projects or all projects.
- Archived projects are excluded from default scopes.
- Deleted documents are excluded from search.
- Search returns chunk-level matches with document and project metadata.
- The UI groups chunk results by document.
- Search combines semantic vector search and Postgres full-text search.
- Search embeds the query for vector search.
- Search also runs Postgres full-text search.
- Hybrid ranking uses Reciprocal Rank Fusion.
- Chunk content participates in full-text search.
- Document title and relevant metadata participate in search ranking.
- Full-text search can return results independently of vector search.
- Embeddings are stored only for chunks in v1.

## Search Filters

- Search filters include project scope, tags, entity names, entity types, date range, document status, and limit or top-K.
- Backend supports filters even when some later-phase data sources are not populated yet.
- Frontend exposes common filters first.
- Advanced filters can be shown in an expanded panel as the interface matures.
- Filters combine with hybrid ranking.
- Search scope supports current project, selected projects, and all projects.

## Chat Persistence and Scope

- Chat conversations are persisted.
- Users can create and view chat threads.
- Chat threads have a default scope.
- Messages are persisted.
- Assistant messages store completion status.
- Chat history survives page refresh.
- Each user message stores the actual scope snapshot used for retrieval.
- Users can change scope mid-thread.
- Each assistant response stores retrieved chunk IDs, citations, model settings, answer text, completion status, and retrieval metadata.
- The UI can show which scope was used for an answer.

## Grounded Chat

- Chat is grounded-only by default.
- The assistant should answer from retrieved knowledge base content and cite stored sources.
- If the knowledge base lacks enough information, the assistant should say so.
- Any future general-knowledge mode must be explicit and clearly labeled.
- Chat retrieval uses hybrid search over the selected scope.
- Chat uses retrieved chunks as primary context.
- The prompt instructs the model to answer from retrieved sources.
- The answer includes citations for source-backed claims.
- Relevant graph context may be included in Phase 4 when tied to retrieved entities.
- Graph facts must remain secondary context and should not become unsupported truth.

## Chat Streaming

- Chat responses stream over SSE.
- Streaming uses a two-step flow: create the user message and pending assistant response first, then connect to a dedicated GET stream.
- Creating a user message creates a pending assistant response and stream identifier.
- The frontend connects to a dedicated SSE stream for the assistant response.
- Tokens or text deltas stream to the UI.
- The server buffers streamed assistant text.
- On completion, the assistant message is persisted with final text and metadata.
- Chat streaming is separate from ingestion/project status streams.
- Basic reconnect behavior is implemented in Phase 5.

## Citations

- Citations are chunk-level in v1.
- Citation payloads include document title, source metadata when available, markdown version, chunk, heading path, offsets, and snippet.
- Clicking a citation opens the document near the relevant chunk.
- Citations are persisted with assistant messages.
- Deleted or unavailable sources are handled gracefully.
- Citation labels are clear in the answer UI.

## Phase 3 Exit Context

By end of Phase 3, ready documents are chunked and embedded, hybrid search returns grouped chunk results, chat persists threads/messages, chat streams via dedicated SSE, and assistant answers cite source chunks while staying grounded in retrieved content.
