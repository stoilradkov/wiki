import { db } from "@wiki/backend/db/client";
import {
  documentChunks,
  documents,
  ingestionEvents,
  ingestionJobs,
  markdownVersions
} from "@wiki/backend/db/schema";
import {
  documentIngestionEventSchema,
  documentChunkSchema,
  documentDetailSchema,
  documentSchema,
  duplicateDocumentResponseSchema,
  listDocumentChunksResponseSchema,
  listMarkdownVersionsResponseSchema,
  markdownVersionSchema,
  type CheckDuplicateDocumentRequest,
  type CreateDocumentRequest,
  type DocumentChunk,
  type DocumentIngestionEvent,
  type DocumentStatus,
  type Document,
  type DocumentDetail,
  type DuplicateDocumentResponse,
  type EventType,
  type IngestionMode,
  type ListDocumentChunksResponse,
  type ListMarkdownVersionsResponse,
  type MarkdownifyResult,
  type MarkdownVersion,
  type PipelineStage,
  type UpdateDocumentMarkdownRequest,
  type UpdateDocumentMetadataRequest
} from "@wiki/shared";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import {
  hashChunkContent,
  hashMarkdown,
  hashRawContent
} from "@wiki/backend/modules/documents/content-hash";
import { chunkMarkdownSemantically } from "@wiki/backend/modules/documents/semantic-chunker";

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
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
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

function mapDocumentChunk(row: typeof documentChunks.$inferSelect): DocumentChunk {
  return documentChunkSchema.parse({
    id: row.id,
    documentId: row.documentId,
    markdownVersionId: row.markdownVersionId,
    chunkIndex: row.chunkIndex,
    headingPath: row.headingPath,
    content: row.content,
    contentHash: row.contentHash,
    tokenCount: row.tokenCount,
    markdownOffsets: {
      start: row.startOffset,
      end: row.endOffset
    },
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

export async function listDocumentChunks(
  projectId: string,
  documentId: string
): Promise<ListDocumentChunksResponse> {
  const [documentRow] = await db
    .select({
      id: documents.id,
      currentMarkdownVersionId: documents.currentMarkdownVersionId
    })
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.id, documentId)))
    .limit(1);

  if (!documentRow?.currentMarkdownVersionId) {
    return listDocumentChunksResponseSchema.parse({ chunks: [] });
  }

  const rows = await db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.markdownVersionId, documentRow.currentMarkdownVersionId))
    .orderBy(documentChunks.chunkIndex);

  return listDocumentChunksResponseSchema.parse({ chunks: rows.map(mapDocumentChunk) });
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
      errorCode: null,
      errorMessage: null,
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
      const nextStatus = documentRow.status === "ready" ? "needs_reprocess" : documentRow.status;
      const [row] = await transaction
        .update(documents)
        .set({
          status: nextStatus,
          currentMarkdownVersionId: previousVersion.id,
          errorCode: null,
          errorMessage: null,
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

    const nextStatus = documentRow.status === "ready" ? "needs_reprocess" : documentRow.status;
    const [row] = await transaction
      .update(documents)
      .set({
        status: nextStatus,
        currentMarkdownVersionId: versionRow.id,
        errorCode: null,
        errorMessage: null,
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
      ...(status === "failed" ? {} : { errorCode: null, errorMessage: null }),
      updatedAt: new Date()
    })
    .where(eq(documents.id, documentId))
    .returning();

  if (!row) {
    throw new Error("Document progress update returned no row");
  }

  const document = mapDocument(row);
  const event = documentIngestionEventSchema.parse({
    type: getIngestionEventType(status, pipelineStage),
    projectId: row.projectId,
    document,
    occurredAt: toIso(new Date())
  });
  await persistIngestionEvent(event);

  return mapDocumentDetail(
    row,
    await getCurrentMarkdownVersion(row.id, row.currentMarkdownVersionId)
  );
}

export async function markDocumentFailed(
  documentId: string,
  error: { code: NonNullable<Document["errorCode"]>; message: string }
): Promise<DocumentDetail> {
  const [row] = await db
    .update(documents)
    .set({
      status: "failed",
      errorCode: error.code,
      errorMessage: error.message,
      updatedAt: new Date()
    })
    .where(eq(documents.id, documentId))
    .returning();

  if (!row) {
    throw new Error("Document failure update returned no row");
  }

  const document = mapDocument(row);
  const event = documentIngestionEventSchema.parse({
    type: "document_failed",
    projectId: row.projectId,
    document,
    occurredAt: toIso(new Date())
  });
  await persistIngestionEvent(event);

  return mapDocumentDetail(
    row,
    await getCurrentMarkdownVersion(row.id, row.currentMarkdownVersionId)
  );
}

export async function getLatestDocumentIngestionEvent(
  documentId: string
): Promise<DocumentIngestionEvent | null> {
  const [row] = await db
    .select()
    .from(ingestionEvents)
    .where(eq(ingestionEvents.documentId, documentId))
    .orderBy(desc(ingestionEvents.createdAt))
    .limit(1);

  return row ? documentIngestionEventSchema.parse(row.payload) : null;
}

export async function queueDocumentForStage(
  projectId: string,
  documentId: string,
  pipelineStage: PipelineStage,
  expectedStatus: DocumentStatus
): Promise<DocumentDetail | null> {
  const [row] = await db
    .update(documents)
    .set({
      status: "queued",
      pipelineStage,
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.id, documentId),
        eq(documents.status, expectedStatus)
      )
    )
    .returning();

  return row
    ? mapDocumentDetail(row, await getCurrentMarkdownVersion(row.id, row.currentMarkdownVersionId))
    : null;
}

export async function queueDocumentForReviewApproval(
  projectId: string,
  documentId: string
): Promise<DocumentDetail | null> {
  const [row] = await db
    .update(documents)
    .set({
      status: "queued",
      pipelineStage: "chunk",
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.id, documentId),
        eq(documents.status, "awaiting_review"),
        isNotNull(documents.currentMarkdownVersionId)
      )
    )
    .returning();

  return row
    ? mapDocumentDetail(row, await getCurrentMarkdownVersion(row.id, row.currentMarkdownVersionId))
    : null;
}

export async function queueDocumentForReprocess(
  projectId: string,
  documentId: string,
  expectedStatus: DocumentStatus
): Promise<DocumentDetail | null> {
  if (!["dirty", "needs_reprocess", "ready", "failed"].includes(expectedStatus)) return null;

  const [row] = await db
    .update(documents)
    .set({
      status: "queued",
      pipelineStage: "chunk",
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.id, documentId),
        eq(documents.status, expectedStatus),
        isNotNull(documents.currentMarkdownVersionId)
      )
    )
    .returning();

  return row
    ? mapDocumentDetail(row, await getCurrentMarkdownVersion(row.id, row.currentMarkdownVersionId))
    : null;
}

export async function queueFailedDocumentForRetry(
  projectId: string,
  documentId: string,
  pipelineStage: PipelineStage
): Promise<DocumentDetail | null> {
  const [row] = await db
    .update(documents)
    .set({
      status: "queued",
      pipelineStage,
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.id, documentId),
        eq(documents.status, "failed")
      )
    )
    .returning();

  return row
    ? mapDocumentDetail(row, await getCurrentMarkdownVersion(row.id, row.currentMarkdownVersionId))
    : null;
}

export async function deleteDocumentDerivedDataForReprocess(documentId: string): Promise<void> {
  await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
}

export async function chunkCurrentMarkdownVersion(documentId: string): Promise<DocumentChunk[]> {
  const chunks = await db.transaction(async (transaction) => {
    const [documentRow] = await transaction
      .select({
        currentMarkdownVersionId: documents.currentMarkdownVersionId
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!documentRow) {
      throw new Error("Document not found for chunking");
    }

    if (!documentRow.currentMarkdownVersionId) {
      throw new Error("Document has no current markdown version for chunking");
    }

    const [versionRow] = await transaction
      .select()
      .from(markdownVersions)
      .where(eq(markdownVersions.id, documentRow.currentMarkdownVersionId))
      .limit(1);

    if (!versionRow) {
      throw new Error("Current markdown version not found for chunking");
    }

    await transaction.delete(documentChunks).where(eq(documentChunks.documentId, documentId));

    const semanticChunks = chunkMarkdownSemantically(versionRow.markdown);
    if (semanticChunks.length === 0) return [];

    return transaction
      .insert(documentChunks)
      .values(
        semanticChunks.map((chunk) => ({
          documentId,
          markdownVersionId: versionRow.id,
          chunkIndex: chunk.chunkIndex,
          headingPath: chunk.headingPath,
          content: chunk.content,
          contentHash: hashChunkContent(chunk.content),
          tokenCount: chunk.tokenCount,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset
        }))
      )
      .returning();
  });

  return chunks.map(mapDocumentChunk);
}

export async function restoreQueuedDocumentStage(
  projectId: string,
  documentId: string,
  status: DocumentStatus,
  pipelineStage: PipelineStage | null,
  error?: { code: NonNullable<Document["errorCode"]>; message: string }
): Promise<void> {
  await db
    .update(documents)
    .set({
      status,
      pipelineStage,
      ...(status === "failed"
        ? error
          ? { errorCode: error.code, errorMessage: error.message }
          : {}
        : { errorCode: null, errorMessage: null }),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.id, documentId),
        eq(documents.status, "queued")
      )
    );
}

export async function markDocumentEnqueueFailed(documentId: string): Promise<DocumentDetail> {
  return markDocumentFailed(
    documentId,
    {
      code: "database_error",
      message: "Document could not be queued for ingestion. Try again."
    }
  );
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
          errorCode: null,
          errorMessage: null,
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
        errorCode: null,
        errorMessage: null,
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

export async function createQueuedIngestionJob(
  documentId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const [row] = await db
    .insert(ingestionJobs)
    .values({
      documentId,
      status: "queued",
      payload
    })
    .returning({ id: ingestionJobs.id });

  if (!row) {
    throw new Error("Ingestion job insert returned no row");
  }
}

export async function markQueuedIngestionJobsFailed(documentId: string): Promise<void> {
  await db
    .update(ingestionJobs)
    .set({ status: "failed" })
    .where(and(eq(ingestionJobs.documentId, documentId), eq(ingestionJobs.status, "queued")));
}

async function persistIngestionEvent(event: DocumentIngestionEvent): Promise<void> {
  const [row] = await db
    .insert(ingestionEvents)
    .values({
      documentId: event.document.id,
      payload: event,
      pipelineStage: event.document.pipelineStage,
      projectId: event.projectId,
      status: event.document.status,
      type: event.type
    })
    .returning({ id: ingestionEvents.id });

  if (!row) {
    throw new Error("Ingestion event insert returned no row");
  }
}

function getIngestionEventType(
  status: DocumentStatus,
  pipelineStage: PipelineStage | null
): EventType {
  if (status === "failed") return "document_failed";
  if (status === "ready") return "document_ready";
  return pipelineStage ? "document_stage_changed" : "document_status_changed";
}
