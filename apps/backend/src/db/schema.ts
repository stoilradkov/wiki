import {
  documentStatusValues,
  embeddingTaskTypeValues,
  entityTypeValues,
  eventTypeValues,
  ingestionModeValues,
  pipelineStageValues,
  predicateValues,
  assistantMessageStatusValues,
  chatMessageRoleValues,
  extractionProfileValues,
  projectIngestionModeValues,
  tagSourceValues,
  type AssistantMessageStatus,
  type ChatMessageRole,
  type ChatModelMetadata,
  type ChatRetrievedChunkReference,
  type ChatRetrievalMetadata,
  type ChatScope,
  type DocumentStatus,
  type EmbeddingTaskType,
  type DocumentIngestionEvent,
  type EventType,
  type ExtractionProfile,
  type IngestionMode,
  type MarkdownVersionAuthor,
  type PipelineStage,
  type Predicate,
  type ProjectIngestionMode,
  type SourceMetadata,
  type EntityType,
  type TagSource
} from "@wiki/shared";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  }
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#1f6feb"),
  icon: text("icon").notNull().default("folder"),
  archived: boolean("archived").notNull().default(false),
  ingestionMode: text("ingestion_mode", { enum: projectIngestionModeValues })
    .$type<ProjectIngestionMode>()
    .notNull()
    .default("inherit"),
  extractionProfile: text("extraction_profile", { enum: extractionProfileValues })
    .$type<ExtractionProfile>()
    .notNull()
    .default("general"),
  customExtractionInstructions: text("custom_extraction_instructions"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("global"),
  defaultIngestionMode: text("default_ingestion_mode", { enum: ingestionModeValues })
    .$type<IngestionMode>()
    .notNull()
    .default("auto"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title"),
    rawContent: text("raw_content").notNull(),
    rawContentHash: text("raw_content_hash").notNull(),
    status: text("status", { enum: documentStatusValues })
      .$type<DocumentStatus>()
      .notNull()
      .default("queued"),
    pipelineStage: text("pipeline_stage", { enum: pipelineStageValues }).$type<PipelineStage>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    ingestionMode: text("ingestion_mode", { enum: ingestionModeValues })
      .$type<IngestionMode>()
      .notNull()
      .default("auto"),
    currentMarkdownVersionId: uuid("current_markdown_version_id"),
    sourceMetadata: jsonb("source_metadata").$type<SourceMetadata>().notNull().default({}),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'title', '')), 'A') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'author', '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(("source_metadata"->'tags')::text, '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(("source_metadata"->'entityNames')::text, '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(("source_metadata"->'entityTypes')::text, '')), 'C') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'url', '')), 'C') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'sourceDate', '')), 'C') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'note', '')), 'C')`
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("documents_project_id_idx").on(table.projectId),
    index("documents_search_vector_idx").using("gin", table.searchVector)
  ]
);

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("ingestion_jobs_document_id_idx").on(table.documentId)]
);

export const ingestionEvents = pgTable(
  "ingestion_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    type: text("type", { enum: eventTypeValues }).$type<EventType>().notNull(),
    status: text("status", { enum: documentStatusValues }).$type<DocumentStatus>().notNull(),
    pipelineStage: text("pipeline_stage", { enum: pipelineStageValues }).$type<PipelineStage>(),
    payload: jsonb("payload").$type<DocumentIngestionEvent>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("ingestion_events_project_id_created_at_idx").on(table.projectId, table.createdAt),
    index("ingestion_events_document_id_idx").on(table.documentId)
  ]
);

export const markdownVersions = pgTable(
  "markdown_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    markdown: text("markdown").notNull(),
    markdownHash: text("markdown_hash").notNull(),
    author: text("author", { enum: ["ai", "user"] })
      .$type<MarkdownVersionAuthor>()
      .notNull()
      .default("ai"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("markdown_versions_document_id_idx").on(table.documentId),
    index("markdown_versions_markdown_hash_idx").on(table.markdownHash)
  ]
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    markdownVersionId: uuid("markdown_version_id")
      .notNull()
      .references(() => markdownVersions.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    headingPath: jsonb("heading_path").$type<string[]>().notNull().default([]),
    content: text("content").notNull(),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce("content", '')), 'A') ||
          setweight(to_tsvector('simple', coalesce("heading_path"::text, '')), 'B')`
    ),
    contentHash: text("content_hash").notNull(),
    tokenCount: integer("token_count").notNull(),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
    embeddingModel: text("embedding_model"),
    embeddingDimension: integer("embedding_dimension"),
    embeddingTaskType: text("embedding_task_type", {
      enum: embeddingTaskTypeValues
    }).$type<EmbeddingTaskType>(),
    embeddedAt: timestamp("embedded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("document_chunks_document_id_idx").on(table.documentId),
    index("document_chunks_markdown_version_id_idx").on(table.markdownVersionId),
    index("document_chunks_search_vector_idx").using("gin", table.searchVector),
    uniqueIndex("document_chunks_markdown_version_index_idx").on(
      table.markdownVersionId,
      table.chunkIndex
    ),
    index("document_chunks_content_hash_idx").on(table.contentHash)
  ]
);

export const documentSummaries = pgTable(
  "document_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    markdownVersionId: uuid("markdown_version_id")
      .notNull()
      .references(() => markdownVersions.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("document_summaries_document_id_idx").on(table.documentId),
    index("document_summaries_markdown_version_id_idx").on(table.markdownVersionId)
  ]
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    normalizedName: text("normalized_name").notNull(),
    displayName: text("display_name").notNull(),
    source: text("source", { enum: tagSourceValues }).$type<TagSource>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("tags_project_normalized_source_idx").on(
      table.projectId,
      table.normalizedName,
      table.source
    ),
    index("tags_project_id_idx").on(table.projectId)
  ]
);

export const documentTags = pgTable(
  "document_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    markdownVersionId: uuid("markdown_version_id")
      .notNull()
      .references(() => markdownVersions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    source: text("source", { enum: tagSourceValues }).$type<TagSource>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("document_tags_document_tag_source_idx").on(
      table.documentId,
      table.tagId,
      table.source
    ),
    index("document_tags_document_id_idx").on(table.documentId),
    index("document_tags_tag_id_idx").on(table.tagId)
  ]
);

export const knowledgeEntities = pgTable(
  "knowledge_entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type", { enum: entityTypeValues }).$type<EntityType>().notNull(),
    normalizedName: text("normalized_name").notNull(),
    displayName: text("display_name").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("knowledge_entities_project_type_name_idx").on(
      table.projectId,
      table.type,
      table.normalizedName
    ),
    index("knowledge_entities_project_id_idx").on(table.projectId)
  ]
);

export const knowledgeTriples = pgTable(
  "knowledge_triples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    subjectEntityId: uuid("subject_entity_id")
      .notNull()
      .references(() => knowledgeEntities.id, { onDelete: "cascade" }),
    objectEntityId: uuid("object_entity_id")
      .notNull()
      .references(() => knowledgeEntities.id, { onDelete: "cascade" }),
    predicate: text("predicate", { enum: predicateValues }).$type<Predicate>().notNull(),
    predicateText: text("predicate_text"),
    confidence: real("confidence").notNull(),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sourceMarkdownVersionId: uuid("source_markdown_version_id")
      .notNull()
      .references(() => markdownVersions.id, { onDelete: "cascade" }),
    sourceChunkId: uuid("source_chunk_id").references(() => documentChunks.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("knowledge_triples_project_id_idx").on(table.projectId),
    index("knowledge_triples_source_document_id_idx").on(table.sourceDocumentId),
    index("knowledge_triples_subject_entity_id_idx").on(table.subjectEntityId),
    index("knowledge_triples_object_entity_id_idx").on(table.objectEntityId)
  ]
);

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    defaultScope: jsonb("default_scope").$type<ChatScope>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("chat_threads_project_id_updated_at_idx").on(table.projectId, table.updatedAt),
    index("chat_threads_project_id_created_at_idx").on(table.projectId, table.createdAt)
  ]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    role: text("role", { enum: chatMessageRoleValues }).$type<ChatMessageRole>().notNull(),
    content: text("content").notNull(),
    assistantStatus: text("assistant_status", {
      enum: assistantMessageStatusValues
    }).$type<AssistantMessageStatus>(),
    scopeSnapshot: jsonb("scope_snapshot").$type<ChatScope>(),
    retrievedChunkReferences: jsonb("retrieved_chunk_references")
      .$type<ChatRetrievedChunkReference[]>()
      .notNull()
      .default([]),
    modelMetadata: jsonb("model_metadata").$type<ChatModelMetadata>(),
    retrievalMetadata: jsonb("retrieval_metadata").$type<ChatRetrievalMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("chat_messages_thread_id_created_at_idx").on(table.threadId, table.createdAt)]
);
