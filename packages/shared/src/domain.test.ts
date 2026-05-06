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
  projectIngestionModeValues,
  predicateValues,
  tagSourceValues
} from "@wiki/shared/domain";
import {
  createDocumentRequestSchema,
  documentDetailSchema,
  markdownifyResultSchema,
  structuredExtractionResultSchema,
  markdownVersionSchema
} from "@wiki/shared";

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
    expect(projectIngestionModeValues).toEqual(["inherit", "auto", "review"]);
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
    expect(domainEnums.tagSources).toEqual(tagSourceValues);
  });

  it("rejects unknown enum values", () => {
    expect(() => documentStatusSchema.parse("archived")).toThrow();
    expect(() => eventTypeSchema.parse("unknown_event")).toThrow();
  });

  it("validates markdownification output and document markdown versions", () => {
    const markdownVersion = markdownVersionSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      documentId: "00000000-0000-4000-8000-000000000002",
      versionNumber: 1,
      markdown: "# Full Notes\n\n- Detail preserved",
      markdownHash: "abc123",
      author: "ai",
      createdAt: "2026-05-04T00:00:00.000Z"
    });

    expect(
      markdownifyResultSchema.parse({
        title: "Full Notes",
        markdown: markdownVersion.markdown
      })
    ).toEqual({
      title: "Full Notes",
      markdown: markdownVersion.markdown
    });

    expect(
      documentDetailSchema.parse({
        id: "00000000-0000-4000-8000-000000000003",
        projectId: "00000000-0000-4000-8000-000000000004",
        title: "Full Notes",
        status: "ready",
        pipelineStage: "complete",
        errorCode: null,
        errorMessage: null,
        ingestionMode: "auto",
        currentMarkdownVersionId: markdownVersion.id,
        sourceMetadata: {},
        rawContentStored: true,
        rawContentHash: "raw123",
        rawContent: "Full Notes\nDetail preserved",
        currentMarkdownVersion: markdownVersion,
        createdAt: "2026-05-04T00:00:00.000Z",
        updatedAt: "2026-05-04T00:00:00.000Z"
      }).currentMarkdownVersion
    ).toEqual(markdownVersion);
  });

  it("preserves pasted raw content during validation", () => {
    const rawContent = "\n  Important pasted text with original spacing.  \n";
    expect(createDocumentRequestSchema.parse({ rawContent }).rawContent).toBe(rawContent);
    expect(() => createDocumentRequestSchema.parse({ rawContent: "   " })).toThrow();
  });

  it("validates structured extraction output before storage", () => {
    const extraction = structuredExtractionResultSchema.parse({
      summary: "Project Alpha depends on Gemini for extraction.",
      tags: ["project alpha", "gemini"],
      entities: [
        { name: "Project Alpha", type: "project" },
        { name: "Gemini", type: "technology" }
      ],
      triples: [
        {
          subject: { name: "Project Alpha", type: "project" },
          predicate: "depends_on",
          object: { name: "Gemini", type: "technology" },
          predicateText: "depends on",
          confidence: 0.9,
          sourceChunkIndex: 0
        }
      ]
    });

    expect(extraction.summary).toContain("Project Alpha");
    expect(() =>
      structuredExtractionResultSchema.parse({
        summary: "Bad predicate",
        triples: [
          {
            subject: { name: "A", type: "project" },
            predicate: "likes",
            object: { name: "B", type: "project" }
          }
        ]
      })
    ).toThrow();
  });
});
