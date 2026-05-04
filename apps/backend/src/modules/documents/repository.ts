import { db } from "@wiki/backend/db/client";
import { documents, ingestionJobs } from "@wiki/backend/db/schema";
import {
  documentDetailSchema,
  documentSchema,
  duplicateDocumentResponseSchema,
  type CheckDuplicateDocumentRequest,
  type CreateDocumentRequest,
  type Document,
  type DocumentDetail,
  type DuplicateDocumentResponse,
  type IngestionMode,
  type UpdateDocumentMetadataRequest
} from "@wiki/shared";
import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";

const toIso = (value: Date) => value.toISOString();

function mapDocument(row: typeof documents.$inferSelect): Document {
  return documentSchema.parse({
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    status: row.status,
    pipelineStage: row.pipelineStage,
    ingestionMode: row.ingestionMode,
    sourceMetadata: row.sourceMetadata,
    rawContentStored: Boolean(row.rawContent),
    rawContentHash: row.rawContentHash,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  });
}

function mapDocumentDetail(row: typeof documents.$inferSelect): DocumentDetail {
  return documentDetailSchema.parse({
    ...mapDocument(row),
    rawContent: row.rawContent
  });
}

function hashRawContent(rawContent: string): string {
  return createHash("sha256").update(rawContent).digest("hex");
}

export async function listDocuments(projectId: string): Promise<Document[]> {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.projectId, projectId))
    .orderBy(desc(documents.updatedAt));

  return rows.map(mapDocument);
}

export async function getDocument(
  projectId: string,
  documentId: string
): Promise<DocumentDetail | null> {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.id, documentId)))
    .limit(1);

  return row ? mapDocumentDetail(row) : null;
}

export async function findDuplicateDocument(
  projectId: string,
  input: CheckDuplicateDocumentRequest
): Promise<DuplicateDocumentResponse> {
  const [row] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.rawContentHash, hashRawContent(input.rawContent))
      )
    )
    .orderBy(desc(documents.updatedAt))
    .limit(1);

  return duplicateDocumentResponseSchema.parse({
    duplicate: row ? mapDocument(row) : null
  });
}

export async function createDocument(
  projectId: string,
  projectIngestionMode: IngestionMode,
  input: CreateDocumentRequest
): Promise<DocumentDetail> {
  const rawContentHash = hashRawContent(input.rawContent);
  const ingestionMode = input.ingestionMode ?? projectIngestionMode;
  const [row] = await db
    .insert(documents)
    .values({
      projectId,
      title: input.title,
      rawContent: input.rawContent,
      rawContentHash,
      status: "queued",
      pipelineStage: "markdownify",
      ingestionMode,
      sourceMetadata: input.sourceMetadata
    })
    .returning();

  if (!row) {
    throw new Error("Document insert returned no row");
  }

  await db.insert(ingestionJobs).values({
    documentId: row.id,
    status: "queued",
    payload: { projectId, ingestionMode }
  });

  return mapDocumentDetail(row);
}

export async function updateDocumentMetadata(
  projectId: string,
  documentId: string,
  input: UpdateDocumentMetadataRequest
): Promise<DocumentDetail | null> {
  const update = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.sourceMetadata !== undefined ? { sourceMetadata: input.sourceMetadata } : {}),
    updatedAt: new Date()
  };

  const [row] = await db
    .update(documents)
    .set(update)
    .where(and(eq(documents.projectId, projectId), eq(documents.id, documentId)))
    .returning();

  return row ? mapDocumentDetail(row) : null;
}
