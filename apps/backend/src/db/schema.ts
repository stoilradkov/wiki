import {
  documentStatusValues,
  ingestionModeValues,
  pipelineStageValues,
  extractionProfileValues,
  projectIngestionModeValues,
  type DocumentStatus,
  type ExtractionProfile,
  type IngestionMode,
  type MarkdownVersionAuthor,
  type PipelineStage,
  type ProjectIngestionMode,
  type SourceMetadata
} from "@wiki/shared";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

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
    ingestionMode: text("ingestion_mode", { enum: ingestionModeValues })
      .$type<IngestionMode>()
      .notNull()
      .default("auto"),
    sourceMetadata: jsonb("source_metadata").$type<SourceMetadata>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("documents_project_id_idx").on(table.projectId)]
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
