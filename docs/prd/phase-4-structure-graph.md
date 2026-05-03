# Phase 4 PRD - Structure and Graph

Goal: extract structure from documents and make relationships explorable.

Use with `stories/phase-4-structure-graph.md`.

## Phase Scope

Phase 4 implements structured extraction, project extraction profiles, normalized tags, entity normalization, graph nodes and edges, graph query API, graph visualization, relevant graph context in chat, and soft cross-project linking.

## Relevant Cross-Phase Context

- Phase 1 provides shared extraction enums, project extraction profile fields, custom extraction instructions, and backend-only Gemini secrets.
- Phase 2 provides markdownification, current markdown versions, explicit reprocess behavior, status/error flow, and review semantics.
- Phase 3 provides chunks, embeddings, hybrid retrieval, chat persistence, and citations.
- Phase 5 will add user tag management, document deletion cleanup, broader tests, and operational hardening.

## Structured Extraction

- Structured extraction runs after markdownification and chunking/embedding as part of the ingestion pipeline.
- Extraction produces summary, AI tags, entities, and knowledge triples.
- Extraction output is validated with shared schemas before storage.
- Malformed extraction output is retried rather than stored.
- If retries fail, the document enters failed state with validation-specific error code.
- Partial invalid graph or entity data is not stored.
- The extraction prompt is biased by the project extraction profile and optional custom instructions.
- Summaries are produced during structured extraction, not during markdownification.

## Extraction Profiles

- Each project has an extraction profile that biases Gemini extraction while still using the global entity type enum.
- Supported extraction profiles include general, work, research, personal, health, learning, and custom.
- Profiles bias prompts without changing the global entity enum.
- Custom profile supports project-specific instructions.
- Custom instructions are included in extraction prompts.
- Custom profiles use custom instructions only; they do not introduce project-specific entity schemas in v1.
- Existing project data remains valid if the profile changes.

## Tags

- Tags are normalized in dedicated tag tables.
- AI-generated tags and user-managed tags are tracked separately by source.
- The UI can display combined tags while preserving provenance.
- AI tags are replaced on each successful extraction for the current document version.
- User tags are never overwritten by reprocessing.
- User tags are managed in Phase 5.
- Tags support filtering, autocomplete, renaming, and future tag pages.
- Tags can be used in document and search filters.

## Entity Types and Predicates

- The global entity type enum is shared across all projects.
- Entity types include person, organization, company, tool, technology, project, document, concept, topic, place, event, task, decision, metric, activity, habit, goal, resource, method, and other.
- The enum supports work, research, learning, and personal tracking use cases such as exercise, body weight, habits, goals, and metrics.
- Project profiles bias which entity types Gemini should prioritize but do not change the enum.
- Triple predicates use a controlled enum plus optional original free-form predicate text.
- Initial predicate options include mentions, related_to, uses, depends_on, part_of, created_by, owned_by, works_at, located_in, decided, requires, and blocks.
- Gemini must choose related_to when no specific predicate fits.

## Entity Normalization

- Knowledge graph entities are project-scoped.
- Entity uniqueness is based on project, normalized name, and type.
- Entity normalization is deterministic and light: lowercase, trim, collapse punctuation and whitespace, and strip common legal suffixes for companies.
- Display names are stored separately from normalized names.
- Common company suffixes are stripped during normalization.
- v1 does not use LLM-based entity resolution.

## Knowledge Graph Storage

- Graph edges store source document, source markdown version, predicate enum, optional predicate text, confidence, and source chunk where available.
- Entity nodes are project-scoped.
- Edges store subject, predicate, object, optional predicate text, confidence, source document, and source version.
- Edges can reference source chunks where available.
- Reprocessing a document deletes and recreates its graph edges.
- Soft-deleting a document deletes its graph edges.
- Future user-confirmed aliases or merges are out of scope for v1.

## Graph Query and Visualization

- The graph view supports entity nodes and document nodes.
- Default graph view is entity-focused, with document nodes available by toggle.
- Document-to-entity mention links can be displayed.
- Graph views support filters by entity type, predicate, tag, date, document, and project scope.
- Graph queries limit node count by default to avoid unusable dense graphs.
- The graph API returns nodes and links for a selected project scope.
- Archived projects and deleted documents are excluded by default.
- Selecting a node shows connected documents and relationships.
- Graph rendering remains usable with sensible default limits.

## Graph-Assisted Chat

- Chat uses retrieved chunks as primary context.
- Relevant graph context may be included when tied to retrieved entities.
- Chat identifies relevant entities from query and retrieved chunks.
- Nearby graph relationships can be included as secondary context.
- Graph context is tied back to source documents or chunks where possible.
- Graph facts must remain secondary context and should not become unsupported truth.
- Graph context can be omitted when not relevant.
- Citations still point to source chunks in v1.

## Cross-Project Soft Linking

- Cross-project search and chat are supported by query scope, not by assigning a document to multiple projects.
- Cross-project linking is soft in v1: project-scoped entities can be grouped in cross-project views by normalized name and type, but no hard global entity merge occurs.
- Project-scoped entity IDs remain separate.
- The UI can show that an entity appears in other projects.
- No automatic global entity merge happens in v1.
- User-confirmed aliasing or merging is left for future work.

## Phase 4 Exit Context

By end of Phase 4, extraction validates summaries/tags/entities/triples before storage, AI and user tags remain separate, project-scoped entities and relationships are stored, graph API returns filtered nodes/links, and relevant graph context can assist chat without replacing source citations.
