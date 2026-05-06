# Phase 3 - Search and Chat

Goal: make the knowledge base searchable and conversational.

This phase implements semantic chunking, Gemini embeddings, full-text indexing, hybrid search, persisted chat, grounded retrieval, SSE chat streaming, and chunk-level citations.

## Epic 7 - Chunking, Embeddings, and Search Indexing

### Story 7.1 - Chunk Markdown Semantically [completed]

**Description:** As a user, I want documents split into meaningful chunks so that search and chat retrieve useful context.

**Phase:** 3

**Dependencies:** Stories 5.3, 5.4, 6.2.

**Acceptance Criteria:**

- Chunking follows markdown structure before token fallback.
- Default target chunk size is 700 tokens.
- Default soft max is 900 tokens.
- Default overlap is 100 tokens.
- Chunks do not split code blocks or tables unless unavoidable.
- Chunks store heading path, index, content hash, and markdown offsets.

### Story 7.2 - Generate Batched Embeddings [completed]

**Description:** As a user, I want chunks embedded efficiently so that documents become searchable by meaning.

**Phase:** 3

**Dependencies:** Stories 7.1, 13.1, 13.2, 14.1.

**Acceptance Criteria:**

- Embeddings use Gemini embedding model defaults.
- Embedding dimension is 768.
- Embeddings are generated in configurable batches.
- Failed large batches can retry as smaller batches.
- Each chunk stores embedding model, dimension, task type, and embedded timestamp.

### Story 7.3 - Build Full-Text Search Indexes [completed]

**Description:** As a user, I want exact terms, names, numbers, and acronyms to be searchable so that semantic search does not miss precise matches.

**Phase:** 3

**Dependencies:** Stories 6.2, 7.1.

**Acceptance Criteria:**

- Chunk content participates in full-text search.
- Document title and relevant metadata participate in search ranking.
- Tags and entity names can be included in search/filtering.
- Deleted documents and archived projects are excluded by default.
- Full-text search can return results independently of vector search.

### Story 7.4 - Run Hybrid Search [completed]

**Description:** As a user, I want search to combine semantic meaning and exact matching so that results are both smart and precise.

**Phase:** 3

**Dependencies:** Stories 7.2, 7.3.

**Acceptance Criteria:**

- Search embeds the query for vector search.
- Search also runs Postgres full-text search.
- Results are merged with Reciprocal Rank Fusion.
- Results are chunk-level with document and project metadata.
- The UI groups chunk results by document.
- Search defaults to the current project.

### Story 7.5 - Filter Search Results [completed]

**Description:** As a user, I want filters for search so that I can narrow results by context.

**Phase:** 3

**Dependencies:** Story 7.4.

**Acceptance Criteria:**

- Backend supports filters for project scope, tags, entity names, entity types, date range, document status, and limit.
- Frontend exposes common filters first.
- Advanced filters can be shown in an expanded panel.
- Filters combine with hybrid ranking.
- Search scope supports current project, selected projects, and all projects.

## Epic 8 - Chat, Retrieval, Streaming, and Citations

### Story 8.1 - Create Persisted Chat Threads [completed]

**Description:** As a user, I want chat threads to persist so that I can continue investigations later.

**Phase:** 3

**Dependencies:** Stories 3.1, 11.1.

**Acceptance Criteria:**

- Users can create and view chat threads.
- Threads have a default project/query scope.
- Messages are persisted.
- Assistant messages store status.
- Chat history survives page refresh.

### Story 8.2 - Store Per-Message Scope Snapshots

**Description:** As a user, I want each chat answer to remember the scope it used so that old answers remain explainable.

**Phase:** 3

**Dependencies:** Stories 8.1, 7.5.

**Acceptance Criteria:**

- Each user message stores the actual scope used.
- Users can change scope mid-thread.
- Assistant responses store retrieved chunk references.
- Assistant responses store model and retrieval metadata.
- The UI can show which scope was used for an answer.

### Story 8.3 - Generate Grounded Answers

**Description:** As a user, I want chat answers grounded in my knowledge base so that I can trust where claims came from.

**Phase:** 3

**Dependencies:** Stories 7.4, 8.1, 8.2, 14.1.

**Acceptance Criteria:**

- Chat retrieval uses hybrid search over the selected scope.
- The prompt instructs the model to answer from retrieved sources.
- The assistant says when the KB lacks enough information.
- General model knowledge is not used by default.
- The answer includes citations for source-backed claims.

### Story 8.5 - Stream Chat Responses

**Description:** As a user, I want chat answers to stream as they are generated so that the app feels responsive.

**Phase:** 3

**Dependencies:** Stories 8.1, 8.2, 8.3.

**Acceptance Criteria:**

- Creating a user message creates a pending assistant response and stream identifier.
- The frontend connects to a dedicated SSE stream for the assistant response.
- Tokens or text deltas are streamed to the UI.
- The server buffers the assistant response.
- On completion, the assistant message is persisted with final text and metadata.

### Story 8.7 - Show Chunk-Level Citations

**Description:** As a user, I want citations to point to source chunks so that I can inspect evidence behind an answer.

**Phase:** 3

**Dependencies:** Stories 7.1, 8.3, 8.5.

**Acceptance Criteria:**

- Citations include document title, source metadata, markdown version, chunk, heading path, offsets, and snippet.
- Clicking a citation opens the document near the relevant chunk.
- Citations are persisted with assistant messages.
- Deleted or unavailable sources are handled gracefully.
- Citation labels are clear in the answer UI.
