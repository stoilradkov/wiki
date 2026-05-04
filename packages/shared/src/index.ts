import { z } from "zod";
import type { BackendEnv, WorkerEnv } from "@wiki/shared/env";
import {
  documentStatusSchema,
  extractionProfileSchema,
  ingestionModeSchema,
  pipelineStageSchema
} from "@wiki/shared/domain";

export {
  backendEnvSchema,
  parseBackendEnv,
  parseWorkerEnv,
  workerEnvSchema,
  type BackendEnv,
  type WorkerEnv
} from "@wiki/shared/env";

export {
  documentStatusSchema,
  documentStatusValues,
  domainEnums,
  domainEnumsSchema,
  entityTypeSchema,
  entityTypeValues,
  eventTypeSchema,
  eventTypeValues,
  extractionProfileSchema,
  extractionProfileValues,
  ingestionModeSchema,
  ingestionModeValues,
  pipelineStageSchema,
  pipelineStageValues,
  predicateSchema,
  predicateValues,
  type DocumentStatus,
  type DomainEnums,
  type EntityType,
  type EventType,
  type ExtractionProfile,
  type IngestionMode,
  type PipelineStage,
  type Predicate
} from "@wiki/shared/domain";

export const packageName = "wiki";

export const appInfoSchema = z.object({
  name: z.literal(packageName),
  version: z.string().min(1)
});

export type AppInfo = z.infer<typeof appInfoSchema>;

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string().min(1),
  app: appInfoSchema
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const publicAiSettingsSchema = z.object({
  provider: z.literal("gemini"),
  generationModel: z.string().min(1),
  embeddingModel: z.string().min(1),
  embeddingDimension: z.number().int().min(1),
  thinkingBudgets: z.object({
    markdownify: z.number().int().min(0),
    extraction: z.number().int().min(0),
    chat: z.number().int().min(0)
  }),
  embeddingBatchSize: z.number().int().min(1),
  workerRetryCount: z.number().int().min(0),
  workerConcurrency: z.number().int().min(1),
  secretStatus: z.enum(["configured", "missing"])
});

export type PublicAiSettings = z.infer<typeof publicAiSettingsSchema>;

export const appSettingsSchema = z.object({
  defaultIngestionMode: ingestionModeSchema,
  ai: publicAiSettingsSchema,
  updatedAt: z.string().datetime()
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const updateAppSettingsRequestSchema = z
  .object({
    defaultIngestionMode: ingestionModeSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one setting is required");

export type UpdateAppSettingsRequest = z.infer<typeof updateAppSettingsRequestSchema>;

export const sourceMetadataSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  sourceDate: z.string().min(1).optional(),
  note: z.string().min(1).optional()
});

export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  color: z.string().min(1),
  icon: z.string().min(1),
  archived: z.boolean(),
  ingestionMode: ingestionModeSchema,
  extractionProfile: extractionProfileSchema,
  customExtractionInstructions: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1_000).optional().default(""),
  color: z.string().trim().min(1).max(32).optional().default("#1f6feb"),
  icon: z.string().trim().min(1).max(48).optional().default("folder"),
  ingestionMode: ingestionModeSchema.optional(),
  extractionProfile: extractionProfileSchema.optional().default("general"),
  customExtractionInstructions: z.string().trim().max(4_000).optional().nullable()
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

export const updateProjectRequestSchema = createProjectRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one project field is required");

export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

export const listProjectsResponseSchema = z.object({
  projects: z.array(projectSchema)
});

export type ListProjectsResponse = z.infer<typeof listProjectsResponseSchema>;

export const documentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().nullable(),
  status: documentStatusSchema,
  pipelineStage: pipelineStageSchema.nullable(),
  ingestionMode: ingestionModeSchema,
  sourceMetadata: sourceMetadataSchema,
  rawContentStored: z.boolean(),
  rawContentHash: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Document = z.infer<typeof documentSchema>;

export const markdownVersionAuthorValues = ["ai", "user"] as const;

export const markdownVersionAuthorSchema = z.enum(markdownVersionAuthorValues);

export type MarkdownVersionAuthor = z.infer<typeof markdownVersionAuthorSchema>;

export const markdownVersionSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  versionNumber: z.number().int().min(1),
  markdown: z.string().min(1),
  markdownHash: z.string().min(1),
  author: markdownVersionAuthorSchema,
  createdAt: z.string().datetime()
});

export type MarkdownVersion = z.infer<typeof markdownVersionSchema>;

export const documentDetailSchema = documentSchema.extend({
  rawContent: z.string().nullable(),
  currentMarkdownVersion: markdownVersionSchema.nullable()
});

export type DocumentDetail = z.infer<typeof documentDetailSchema>;

export const markdownifyResultSchema = z.object({
  title: z.string().trim().min(1).max(240),
  markdown: z.string().trim().min(1)
});

export type MarkdownifyResult = z.infer<typeof markdownifyResultSchema>;

export const createDocumentRequestSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  rawContent: z
    .string()
    .min(1)
    .refine((value) => value.trim().length > 0, "Raw content is required"),
  sourceMetadata: sourceMetadataSchema.optional().default({}),
  ingestionMode: ingestionModeSchema.optional()
});

export type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>;

export const checkDuplicateDocumentRequestSchema = z.object({
  rawContent: z
    .string()
    .min(1)
    .refine((value) => value.trim().length > 0, "Raw content is required")
});

export type CheckDuplicateDocumentRequest = z.infer<typeof checkDuplicateDocumentRequestSchema>;

export const duplicateDocumentResponseSchema = z.object({
  duplicate: documentSchema.nullable()
});

export type DuplicateDocumentResponse = z.infer<typeof duplicateDocumentResponseSchema>;

export const updateDocumentMetadataRequestSchema = z.object({
  title: z.string().trim().min(1).max(240).optional().nullable(),
  sourceMetadata: sourceMetadataSchema.optional()
});

export type UpdateDocumentMetadataRequest = z.infer<typeof updateDocumentMetadataRequestSchema>;

export const listDocumentsResponseSchema = z.object({
  documents: z.array(documentSchema)
});

export type ListDocumentsResponse = z.infer<typeof listDocumentsResponseSchema>;

export const ingestionJobDataSchema = z.object({
  documentId: z.string().uuid(),
  projectId: z.string().uuid(),
  ingestionMode: ingestionModeSchema
});

export type IngestionJobData = z.infer<typeof ingestionJobDataSchema>;

export const ingestionQueueName = "document-ingestion";

export function createAppInfo(version = "0.1.0"): AppInfo {
  return appInfoSchema.parse({
    name: packageName,
    version
  });
}

export function createPublicAiSettings(env: BackendEnv | WorkerEnv): PublicAiSettings {
  return publicAiSettingsSchema.parse({
    provider: "gemini",
    generationModel: env.AI_GENERATION_MODEL,
    embeddingModel: env.AI_EMBEDDING_MODEL,
    embeddingDimension: env.AI_EMBEDDING_DIMENSION,
    thinkingBudgets: {
      markdownify: env.AI_THINKING_BUDGET_MARKDOWNIFY,
      extraction: env.AI_THINKING_BUDGET_EXTRACTION,
      chat: env.AI_THINKING_BUDGET_CHAT
    },
    embeddingBatchSize: env.AI_EMBEDDING_BATCH_SIZE,
    workerRetryCount: env.WORKER_RETRY_COUNT,
    workerConcurrency: env.WORKER_CONCURRENCY,
    secretStatus: env.GEMINI_API_KEY ? "configured" : "missing"
  });
}
