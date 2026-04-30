import { describe, expect, it } from "vitest";
import {
  documentStatusSchema,
  documentStatusValues,
  domainEnums,
  entityTypeValues,
  eventTypeSchema,
  extractionProfileValues,
  ingestionModeValues,
  pipelineStageValues,
  predicateValues
} from "./domain";

describe("shared domain enums", () => {
  it("covers the v1 document statuses and pipeline stages", () => {
    expect(documentStatusValues).toEqual([
      "queued",
      "processing",
      "awaiting_review",
      "ready",
      "failed",
      "dirty",
      "deleted",
      "needs_reprocess"
    ]);

    expect(pipelineStageValues).toEqual([
      "markdownify",
      "review",
      "chunk",
      "embed",
      "extract",
      "graph",
      "complete"
    ]);
  });

  it("covers v1 ingestion modes and extraction profiles", () => {
    expect(ingestionModeValues).toEqual(["auto", "review"]);
    expect(extractionProfileValues).toEqual([
      "general",
      "work",
      "research",
      "personal",
      "health",
      "learning",
      "custom"
    ]);
  });

  it("includes graph concepts and predicates from the PRD", () => {
    expect(entityTypeValues).toEqual([
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
    ]);

    expect(predicateValues).toEqual([
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
    ]);
  });

  it("exposes parsed enum collections for frontend and backend use", () => {
    expect(domainEnums.documentStatuses).toHaveLength(documentStatusValues.length);
    expect(domainEnums.entityTypes).toContain("metric");
    expect(domainEnums.entityTypes).toContain("habit");
    expect(domainEnums.entityTypes).toContain("goal");
    expect(domainEnums.predicates).toContain("related_to");
  });

  it("rejects unknown enum values", () => {
    expect(() => documentStatusSchema.parse("archived")).toThrow();
    expect(() => eventTypeSchema.parse("unknown_event")).toThrow();
  });
});
