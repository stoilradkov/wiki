import { and, eq } from "drizzle-orm";
import { db } from "@wiki/backend/db/client";
import {
  documentChunks,
  documentSummaries,
  documentTags,
  documents,
  knowledgeEntities,
  knowledgeTriples,
  markdownVersions,
  projects,
  tags
} from "@wiki/backend/db/schema";
import {
  structuredExtractionResultSchema,
  type ExtractionProfile,
  type StructuredExtractionResult
} from "@wiki/shared";

export type ExtractionDocumentChunk = {
  id: string;
  chunkIndex: number;
  headingPath: string[];
  content: string;
};

export type ExtractionDocumentInput = {
  documentId: string;
  projectId: string;
  title: string | null;
  markdownVersionId: string;
  markdown: string;
  extractionProfile: ExtractionProfile;
  customExtractionInstructions: string | null;
  chunks: ExtractionDocumentChunk[];
};

type EntityKey = {
  normalizedName: string;
  type: StructuredExtractionResult["entities"][number]["type"];
};

type EntityValue = EntityKey & {
  displayName: string;
  aliases: string[];
  description: string | null;
};

export async function getExtractionDocumentInput(
  documentId: string
): Promise<ExtractionDocumentInput> {
  const [row] = await db
    .select({
      documentId: documents.id,
      projectId: documents.projectId,
      title: documents.title,
      markdownVersionId: markdownVersions.id,
      markdown: markdownVersions.markdown,
      extractionProfile: projects.extractionProfile,
      customExtractionInstructions: projects.customExtractionInstructions
    })
    .from(documents)
    .innerJoin(projects, eq(projects.id, documents.projectId))
    .innerJoin(markdownVersions, eq(markdownVersions.id, documents.currentMarkdownVersionId))
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!row) {
    throw new Error("Document not found for structured extraction");
  }

  const chunkRows = await db
    .select({
      id: documentChunks.id,
      chunkIndex: documentChunks.chunkIndex,
      headingPath: documentChunks.headingPath,
      content: documentChunks.content
    })
    .from(documentChunks)
    .where(eq(documentChunks.markdownVersionId, row.markdownVersionId))
    .orderBy(documentChunks.chunkIndex);

  return {
    ...row,
    chunks: chunkRows
  };
}

export async function storeStructuredExtractionResult(
  documentId: string,
  expectedMarkdownVersionId: string,
  result: StructuredExtractionResult
): Promise<boolean> {
  const extraction = structuredExtractionResultSchema.parse(result);

  return db.transaction(async (transaction) => {
    const [documentRow] = await transaction
      .select({
        projectId: documents.projectId,
        markdownVersionId: documents.currentMarkdownVersionId
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!documentRow) {
      throw new Error("Document not found for storing structured extraction");
    }

    if (!documentRow.markdownVersionId) {
      throw new Error("Document has no markdown version for storing structured extraction");
    }

    if (documentRow.markdownVersionId !== expectedMarkdownVersionId) {
      return false;
    }

    const chunkRows = await transaction
      .select({
        id: documentChunks.id,
        chunkIndex: documentChunks.chunkIndex
      })
      .from(documentChunks)
      .where(eq(documentChunks.markdownVersionId, expectedMarkdownVersionId));

    await transaction.delete(documentSummaries).where(eq(documentSummaries.documentId, documentId));
    await transaction
      .delete(documentTags)
      .where(and(eq(documentTags.documentId, documentId), eq(documentTags.source, "ai")));
    await transaction
      .delete(knowledgeTriples)
      .where(eq(knowledgeTriples.sourceDocumentId, documentId));

    await transaction.insert(documentSummaries).values({
      documentId,
      markdownVersionId: expectedMarkdownVersionId,
      summary: extraction.summary
    });

    const tagValues = deduplicateStrings(extraction.tags);
    for (const tag of tagValues) {
      const normalizedName = normalizeTagName(tag);
      if (!normalizedName) continue;

      const [tagRow] = await transaction
        .insert(tags)
        .values({
          projectId: documentRow.projectId,
          normalizedName,
          displayName: tag.trim(),
          source: "ai"
        })
        .onConflictDoUpdate({
          target: [tags.projectId, tags.normalizedName, tags.source],
          set: {
            displayName: tag.trim(),
            updatedAt: new Date()
          }
        })
        .returning({ id: tags.id });

      if (!tagRow) {
        throw new Error("Tag upsert returned no row");
      }

      await transaction.insert(documentTags).values({
        documentId,
        markdownVersionId: expectedMarkdownVersionId,
        tagId: tagRow.id,
        source: "ai"
      });
    }

    const entityIds = new Map<string, string>();
    for (const entity of collectEntities(extraction)) {
      const [entityRow] = await transaction
        .insert(knowledgeEntities)
        .values({
          projectId: documentRow.projectId,
          type: entity.type,
          normalizedName: entity.normalizedName,
          displayName: entity.displayName,
          aliases: entity.aliases,
          description: entity.description
        })
        .onConflictDoUpdate({
          target: [
            knowledgeEntities.projectId,
            knowledgeEntities.type,
            knowledgeEntities.normalizedName
          ],
          set: {
            displayName: entity.displayName,
            aliases: entity.aliases,
            description: entity.description,
            updatedAt: new Date()
          }
        })
        .returning({ id: knowledgeEntities.id });

      if (!entityRow) {
        throw new Error("Knowledge entity upsert returned no row");
      }

      entityIds.set(createEntityMapKey(entity), entityRow.id);
    }

    for (const triple of extraction.triples) {
      const subjectId = entityIds.get(
        createEntityMapKey({
          normalizedName: normalizeEntityName(triple.subject.name, triple.subject.type),
          type: triple.subject.type
        })
      );
      const objectId = entityIds.get(
        createEntityMapKey({
          normalizedName: normalizeEntityName(triple.object.name, triple.object.type),
          type: triple.object.type
        })
      );

      if (!subjectId || !objectId) {
        throw new Error("Extracted triple referenced an entity that was not stored");
      }

      await transaction.insert(knowledgeTriples).values({
        projectId: documentRow.projectId,
        subjectEntityId: subjectId,
        objectEntityId: objectId,
        predicate: triple.predicate,
        predicateText: triple.predicateText ?? null,
        confidence: triple.confidence,
        sourceDocumentId: documentId,
        sourceMarkdownVersionId: expectedMarkdownVersionId,
        sourceChunkId: findChunkId(chunkRows, triple.sourceChunkIndex ?? null)
      });
    }

    return true;
  });
}

function collectEntities(result: StructuredExtractionResult): EntityValue[] {
  const entities = new Map<string, EntityValue>();

  for (const entity of result.entities) {
    const normalizedName = normalizeEntityName(entity.name, entity.type);
    if (!normalizedName) continue;
    const value: EntityValue = {
      normalizedName,
      type: entity.type,
      displayName: entity.name.trim(),
      aliases: deduplicateStrings(entity.aliases),
      description: entity.description ?? null
    };
    entities.set(createEntityMapKey(value), value);
  }

  for (const triple of result.triples) {
    for (const ref of [triple.subject, triple.object]) {
      const normalizedName = normalizeEntityName(ref.name, ref.type);
      if (!normalizedName) continue;
      const key = createEntityMapKey({ normalizedName, type: ref.type });
      if (!entities.has(key)) {
        entities.set(key, {
          normalizedName,
          type: ref.type,
          displayName: ref.name.trim(),
          aliases: [],
          description: null
        });
      }
    }
  }

  return [...entities.values()];
}

function createEntityMapKey(entity: EntityKey): string {
  return `${entity.type}:${entity.normalizedName}`;
}

function findChunkId(
  chunks: Array<{ id: string; chunkIndex: number }>,
  chunkIndex: number | null
): string | null {
  if (chunkIndex === null) return null;
  return chunks.find((chunk) => chunk.chunkIndex === chunkIndex)?.id ?? null;
}

function deduplicateStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeTagName(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value.trim());
  }

  return result;
}

function normalizeTagName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeEntityName(value: string, type: EntityKey["type"]): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (type !== "company") return normalized;

  return normalized
    .replace(/\b(incorporated|inc|llc|ltd|limited|corp|corporation|company|co)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
