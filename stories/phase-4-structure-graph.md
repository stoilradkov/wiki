# Phase 4 - Structure and Graph

Goal: extract structure from documents and make relationships explorable.

This phase implements structured extraction, project extraction profiles, normalized tags, entity normalization, graph storage, graph queries, graph visualization, relevant graph context in chat, and soft cross-project linking.

## Epic 2 - Shared Contracts and Validation

### Story 2.3 - Validate AI Extraction Output

**Description:** As a user, I want AI extraction output to be schema-validated so that malformed model responses do not pollute my knowledge base.

**Phase:** 4

**Dependencies:** Stories 2.1, 5.7, 9.1.

**Acceptance Criteria:**

- Structured extraction output is validated before storage.
- Invalid extraction output is retried according to worker retry policy.
- Repeated validation failure marks the document failed with a validation-specific error.
- Partial invalid graph or entity data is not stored.
- The user can retry the failed document later.

## Epic 8 - Chat, Retrieval, Streaming, and Citations

### Story 8.4 - Include Relevant Graph Context

**Description:** As a user, I want chat to use relevant graph relationships when helpful so that answers can connect concepts across documents.

**Phase:** 4

**Dependencies:** Stories 8.3, 9.5, 10.1.

**Acceptance Criteria:**

- Chat identifies relevant entities from query and retrieved chunks.
- Nearby graph relationships can be included as secondary context.
- Graph context is tied back to source documents or chunks where possible.
- Graph facts do not replace citations from source content.
- The system can omit graph context when not relevant.

## Epic 9 - Structured Extraction, Tags, and Entities

### Story 9.1 - Extract Summaries, Tags, Entities, and Triples

**Description:** As a user, I want the system to extract structure from documents so that my wiki becomes connected and browsable.

**Phase:** 4

**Dependencies:** Stories 5.3, 5.4, 7.1, 13.2, 14.1.

**Acceptance Criteria:**

- Extraction produces a summary.
- Extraction produces AI tags.
- Extraction produces typed entities.
- Extraction produces controlled-predicate triples with optional original predicate text.
- Extraction output is schema-validated before storage.

### Story 9.2 - Apply Project Extraction Profiles

**Description:** As a user, I want projects to bias extraction toward their domain so that a health project and work project extract the right kinds of concepts.

**Phase:** 4

**Dependencies:** Stories 3.1, 9.1.

**Acceptance Criteria:**

- Projects can select an extraction profile.
- Profiles bias prompts without changing the global entity enum.
- Custom profile supports project-specific instructions.
- Custom instructions are included in extraction prompts.
- Existing project data remains valid if the profile changes.

### Story 9.3 - Normalize and Store Tags

**Description:** As a user, I want tags to be consistent and filterable so that I can organize documents over time.

**Phase:** 4

**Dependencies:** Story 9.1.

**Acceptance Criteria:**

- Tags are stored in normalized tables.
- Document-tag relationships record whether tags are AI or user generated.
- AI tags are replaced on successful reprocess.
- User tags are preserved on reprocess.
- Tags can be used in document and search filters.

### Story 9.5 - Normalize and Upsert Entities

**Description:** As a user, I want equivalent entity names within a project to map to the same node so that the graph is not full of obvious duplicates.

**Phase:** 4

**Dependencies:** Stories 9.1, 9.2.

**Acceptance Criteria:**

- Entity names are normalized deterministically.
- Entity display names are stored separately.
- Entity uniqueness is scoped by project, normalized name, and type.
- Common company suffixes are stripped during normalization.
- LLM-based entity resolution is not used in v1.

## Epic 10 - Knowledge Graph

### Story 10.1 - Store Graph Nodes and Edges

**Description:** As a user, I want extracted entities and relationships stored as a graph so that I can see how concepts connect.

**Phase:** 4

**Dependencies:** Stories 9.1, 9.5.

**Acceptance Criteria:**

- Entity nodes are project-scoped.
- Edges store subject, predicate, object, optional predicate text, confidence, source document, and source version.
- Edges can reference source chunks where available.
- Reprocessing a document deletes and recreates its graph edges.
- Soft-deleting a document deletes its graph edges.

### Story 10.2 - Query Project Graph Data

**Description:** As a user, I want to load graph data for a project so that the frontend can visualize relationships.

**Phase:** 4

**Dependencies:** Story 10.1.

**Acceptance Criteria:**

- The graph API returns nodes and links for a selected project scope.
- The graph API supports entity type and predicate filters.
- The graph API supports date, tag, and document filters.
- The graph API limits result size by default.
- Archived projects and deleted documents are excluded by default.

### Story 10.3 - Visualize the Knowledge Graph

**Description:** As a user, I want a force-directed graph view so that I can explore relationships visually.

**Phase:** 4

**Dependencies:** Story 10.2.

**Acceptance Criteria:**

- The graph view renders entity nodes and edges.
- Document nodes can be toggled on.
- Default view is entity-focused.
- Users can filter by entity type and predicate.
- Selecting a node shows connected documents and relationships.
- Graph rendering remains usable with sensible default limits.

### Story 10.4 - Show Soft Cross-Project Links

**Description:** As a user, I want to see when similar entities appear across projects so that I can connect knowledge without unsafe automatic merges.

**Phase:** 4

**Dependencies:** Stories 9.5, 10.2.

**Acceptance Criteria:**

- Cross-project views can group likely matching entities by normalized name and type.
- Project-scoped entity IDs remain separate.
- The UI can show that an entity appears in other projects.
- No automatic global entity merge happens in v1.
- User-confirmed aliasing or merging is left for future work.
