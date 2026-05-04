import { z } from "zod";

export const documentStatusValues = [
  "queued",
  "processing",
  "awaiting_review",
  "ready",
  "failed",
  "dirty",
  "deleted",
  "needs_reprocess"
] as const;

export const documentStatusSchema = z.enum(documentStatusValues);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const pipelineStageValues = [
  "markdownify",
  "review",
  "chunk",
  "embed",
  "extract",
  "graph",
  "complete"
] as const;

export const pipelineStageSchema = z.enum(pipelineStageValues);
export type PipelineStage = z.infer<typeof pipelineStageSchema>;

export const ingestionModeValues = ["auto", "review"] as const;

export const ingestionModeSchema = z.enum(ingestionModeValues);
export type IngestionMode = z.infer<typeof ingestionModeSchema>;

export const projectIngestionModeValues = ["inherit", ...ingestionModeValues] as const;

export const projectIngestionModeSchema = z.enum(projectIngestionModeValues);
export type ProjectIngestionMode = z.infer<typeof projectIngestionModeSchema>;

export const extractionProfileValues = [
  "general",
  "work",
  "research",
  "personal",
  "health",
  "learning",
  "custom"
] as const;

export const extractionProfileSchema = z.enum(extractionProfileValues);
export type ExtractionProfile = z.infer<typeof extractionProfileSchema>;

export const entityTypeValues = [
  "person",
  "organization",
  "company",
  "tool",
  "technology",
  "project",
  "document",
  "concept",
  "topic",
  "place",
  "event",
  "task",
  "decision",
  "metric",
  "activity",
  "habit",
  "goal",
  "resource",
  "method",
  "other"
] as const;

export const entityTypeSchema = z.enum(entityTypeValues);
export type EntityType = z.infer<typeof entityTypeSchema>;

export const predicateValues = [
  "mentions",
  "related_to",
  "uses",
  "depends_on",
  "part_of",
  "created_by",
  "owned_by",
  "works_at",
  "located_in",
  "decided",
  "requires",
  "blocks"
] as const;

export const predicateSchema = z.enum(predicateValues);
export type Predicate = z.infer<typeof predicateSchema>;

export const eventTypeValues = [
  "ingestion_snapshot",
  "document_status_changed",
  "document_stage_changed",
  "document_failed",
  "document_ready",
  "chat_token",
  "chat_completed",
  "chat_error",
  "heartbeat"
] as const;

export const eventTypeSchema = z.enum(eventTypeValues);
export type EventType = z.infer<typeof eventTypeSchema>;

export const domainEnumsSchema = z.object({
  documentStatuses: z.array(documentStatusSchema).readonly(),
  pipelineStages: z.array(pipelineStageSchema).readonly(),
  ingestionModes: z.array(ingestionModeSchema).readonly(),
  projectIngestionModes: z.array(projectIngestionModeSchema).readonly(),
  extractionProfiles: z.array(extractionProfileSchema).readonly(),
  entityTypes: z.array(entityTypeSchema).readonly(),
  predicates: z.array(predicateSchema).readonly(),
  eventTypes: z.array(eventTypeSchema).readonly()
});

export type DomainEnums = z.infer<typeof domainEnumsSchema>;

export const domainEnums = domainEnumsSchema.parse({
  documentStatuses: documentStatusValues,
  pipelineStages: pipelineStageValues,
  ingestionModes: ingestionModeValues,
  projectIngestionModes: projectIngestionModeValues,
  extractionProfiles: extractionProfileValues,
  entityTypes: entityTypeValues,
  predicates: predicateValues,
  eventTypes: eventTypeValues
});
