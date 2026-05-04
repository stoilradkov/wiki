import { db } from "@wiki/backend/db/client";
import { documents, ingestionJobs, markdownVersions } from "@wiki/backend/db/schema";
import {
  documentDetailSchema,
  documentSchema,
  duplicateDocumentResponseSchema,
  listMarkdownVersionsResponseSchema,
  markdownVersionSchema,
  type CheckDuplicateDocumentRequest,
  type CreateDocumentRequest,
  type DocumentStatus,
  type Document,
  type DocumentDetail,
  type DuplicateDocumentResponse,
  type IngestionMode,
  type ListMarkdownVersionsResponse,
  type MarkdownifyResult,
  type MarkdownVersion,
  type PipelineStage,
  type UpdateDocumentMarkdownRequest,
  type UpdateDocumentMetadataRequest
} from "@wiki/shared";
import { and, desc, eq, isNull } from "drizzle-orm";
import { createHash } from "node:crypto";

const toIso = (value: Date) => value.toISOString();

function mapDocument(
  row: typeof documents.$inferSelect,
  currentMarkdownVersionId = row.currentMarkdownVersionId
): Document {
  return documentSchema.parse({
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    status: row.status,
    pipelineStage: row.pipelineStage,
    ingestionMode: row.ingestionMode,
    currentMarkdownVersionId,
    sourceMetadata: row.sourceMetadata,
    rawContentStored: Boolean(row.rawContent),
    rawContentHash: row.rawContentHash,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  });
}

function mapMarkdownVersion(row: typeof markdownVersions.$inferSelect): MarkdownVersion {
  return markdownVersionSchema.parse({
    id: row.id,
    documentId: row.documentId,
    versionNumber: row.versionNumber,
    markdown: row.markdown,
    markdownHash: row.markdownHash,
    author: row.author,
    createdAt: toIso(row.createdAt)
  });
}

function mapDocumentDetail(
  row: typeof documents.$inferSelect,
  currentMarkdownVersion: MarkdownVersion | null
): DocumentDetail {
  return documentDetailSchema.parse({
    ...mapDocument(row, row.currentMarkdownVersionId ?? currentMarkdownVersion?.id ?? null),
    rawContent: row.rawContent,
    currentMarkdownVersion
  });
}

function hashRawContent(rawContent: string): string {
  return createHash("sha256").update(rawContent).digest("hex");
}

function hashMarkdown(markdown: string): string {
  return createHash("sha256").update(markdown).digest("hex");
}

async function getLatestMarkdownVersion(documentId: string): Promise<MarkdownVersion | null> {
  const [row] = await db
    .select()
    .from(markdownVersions)
    .where(eq(markdownVersions.documentId, documentId))
    .orderBy(desc(markdownVersions.versionNumber))
    .limit(1);

  return row ? mapMarkdownVersion(row) : null;
}

async function getCurrentMarkdownVersion(
  documentId: string,
  currentMarkdownVersionId: string | null
): Promise<MarkdownVersion | null> {
  if (!currentMarkdownVersionId) {
    const latestVersion = await getLatestMarkdownVersion(documentId);

    if (latestVersion) {
      await db
        .update(documents)
        .set({ currentMarkdownVersionId: latestVersion.id })
        .where(and(eq(documents.id, documentId), isNull(documents.currentMarkdownVersionId)));
    }

    return latestVersion;
  }

  const [row] = await db
    .select()
    .from(markdownVersions)
    .where(
      and(
        eq(markdownVersions.documentId, documentId),
        eq(markdownVersions.id, currentMarkdownVersionId)
      )
    )
    .limit(1);

  return row ? mapMarkdownVersion(row) : getLatestMarkdownVersion(documentId);
}

export async function listDocuments(projectId: string): Promise<Document[]> {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.projectId, projectId))
    .orderBy(desc(documents.updatedAt));

  return rows.map((row) => mapDocument(row));
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

  return row
    ? mapDocumentDetail(row, await getCurrentMarkdownVersion(row.id, row.currentMarkdownVersionId))
    : null;
}

export async function listMarkdownVersions(
  projectId: string,
  documentId: string
): Promise<ListMarkdownVersionsResponse> {
  const [documentRow] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.id, documentId)))
    .limit(1);

  if (!documentRow) {
    return listMarkdownVersionsResponseSchema.parse({ versions: [] });
  }

  const rows = await db
    .select()
    .from(markdownVersions)
    .where(eq(markdownVersions.documentId, documentId))
    .orderBy(desc(markdownVersions.versionNumber));

  return listMarkdownVersionsResponseSchema.parse({ versions: rows.map(mapMarkdownVersion) });
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
  defaultIngestionMode: IngestionMode,
  input: CreateDocumentRequest
): Promise<DocumentDetail> {
  const rawContentHash = hashRawContent(input.rawContent);
  const ingestionMode = input.ingestionMode ?? defaultIngestionMode;
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

  return mapDocumentDetail(row, null);
}

export async function deleteDocument(documentId: string): Promise<void> {
  await db.delete(documents).where(eq(documents.id, documentId));
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

  return row
    ? mapDocumentDetail(row, await getCurrentMarkdownVersion(row.id, row.currentMarkdownVersionId))
    : null;
}

export async function updateDocumentMarkdown(
  projectId: string,
  documentId: string,
  input: UpdateDocumentMarkdownRequest
): Promise<DocumentDetail | null> {
  const markdown = input.markdown.trim();
  const markdownHash = hashMarkdown(markdown);
  const [updatedDocument, currentVersion] = await db.transaction(async (transaction) => {
    const [documentRow] = await transaction
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.id, documentId)))
      .limit(1);

    if (!documentRow) {
      return [null, null];
    }

    const [previousVersion] = await transaction
      .select()
      .from(markdownVersions)
      .where(eq(markdownVersions.documentId, documentId))
      .orderBy(desc(markdownVersions.versionNumber))
      .limit(1);

    if (previousVersion?.markdownHash === markdownHash) {
      const nextStatus = documentRow.status === "ready" ? "dirty" : documentRow.status;
      const [row] = await transaction
        .update(documents)
        .set({
          status: nextStatus,
          currentMarkdownVersionId: previousVersion.id,
          updatedAt: new Date()
        })
        .where(and(eq(documents.projectId, projectId), eq(documents.id, documentId)))
        .returning();

      if (!row) {
        throw new Error("Document markdown edit update returned no row");
      }

      return [row, previousVersion];
    }

    const [versionRow] = await transaction
      .insert(markdownVersions)
      .values({
        documentId,
        versionNumber: previousVersion ? previousVersion.versionNumber + 1 : 1,
        markdown,
        markdownHash,
        author: "user"
      })
      .returning();

    if (!versionRow) {
      throw new Error("Markdown edit version insert returned no row");
    }

    const nextStatus = documentRow.status === "ready" ? "dirty" : documentRow.status;
    const [row] = await transaction
      .update(documents)
      .set({
        status: nextStatus,
        currentMarkdownVersionId: versionRow.id,
        updatedAt: new Date()
      })
      .where(and(eq(documents.projectId, projectId), eq(documents.id, documentId)))
      .returning();

    if (!row) {
      throw new Error("Document markdown edit update returned no row");
    }

    return [row, versionRow];
  });

  return updatedDocument && currentVersion
    ? mapDocumentDetail(updatedDocument, mapMarkdownVersion(currentVersion))
    : null;
}

export async function updateDocumentProgress(
  documentId: string,
  status: DocumentStatus,
  pipelineStage: PipelineStage | null
): Promise<DocumentDetail> {
  const [row] = await db
    .update(documents)
    .set({
      status,
      pipelineStage,
      updatedAt: new Date()
    })
    .where(eq(documents.id, documentId))
    .returning();

  if (!row) {
    throw new Error("Document progress update returned no row");
  }

  return mapDocumentDetail(row, await getCurrentMarkdownVersion(row.id, row.currentMarkdownVersionId));
}

export async function markDocumentEnqueueFailed(documentId: string): Promise<DocumentDetail> {
  return updateDocumentProgress(documentId, "failed", "markdownify");
}

export async function createMarkdownVersionFromMarkdownify(
  documentId: string,
  result: MarkdownifyResult
): Promise<DocumentDetail> {
  const markdownHash = hashMarkdown(result.markdown);
  const [updatedDocument, currentVersion] = await db.transaction(async (transaction) => {
    const [documentRow] = await transaction
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!documentRow) {
      throw new Error("Document not found for markdown version");
    }

    const [previousVersion] = await transaction
      .select()
      .from(markdownVersions)
      .where(eq(markdownVersions.documentId, documentId))
      .orderBy(desc(markdownVersions.versionNumber))
      .limit(1);

    if (previousVersion?.markdownHash === markdownHash) {
      const title = documentRow.title?.trim() ? documentRow.title : result.title;
      const [row] = await transaction
        .update(documents)
        .set({
          title,
          currentMarkdownVersionId: previousVersion.id,
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId))
        .returning();

      if (!row) {
        throw new Error("Document markdown update returned no row");
      }

      return [row, previousVersion];
    }

    const [versionRow] = await transaction
      .insert(markdownVersions)
      .values({
        documentId,
        versionNumber: previousVersion ? previousVersion.versionNumber + 1 : 1,
        markdown: result.markdown,
        markdownHash,
        author: "ai"
      })
      .returning();

    if (!versionRow) {
      throw new Error("Markdown version insert returned no row");
    }

    const title = documentRow.title?.trim() ? documentRow.title : result.title;
    const [row] = await transaction
      .update(documents)
      .set({
        title,
        currentMarkdownVersionId: versionRow.id,
        updatedAt: new Date()
      })
      .where(eq(documents.id, documentId))
      .returning();

    if (!row) {
      throw new Error("Document markdown update returned no row");
    }

    return [row, versionRow];
  });

  return mapDocumentDetail(updatedDocument, mapMarkdownVersion(currentVersion));
}

export async function updateIngestionJobStatus(
  documentId: string,
  status: "queued" | "processing" | "completed" | "failed"
): Promise<void> {
  const [row] = await db
    .update(ingestionJobs)
    .set({ status })
    .where(eq(ingestionJobs.documentId, documentId))
    .returning({ id: ingestionJobs.id });

  if (!row) {
    throw new Error("Ingestion job status update returned no row");
  }
}
