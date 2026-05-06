import { db } from "@wiki/backend/db/client";
import { documentChunks, documents, projects } from "@wiki/backend/db/schema";
import {
  documentChunkSchema,
  fullTextSearchResponseSchema,
  type DocumentChunk,
  type FullTextSearchRequest,
  type FullTextSearchResponse
} from "@wiki/shared";
import { and, desc, eq, inArray, ne, or, sql, type SQL } from "drizzle-orm";

const toIso = (value: Date) => value.toISOString();
const headlineStart = "WIKI_SEARCH_MARK_START";
const headlineStop = "WIKI_SEARCH_MARK_STOP";

type FullTextSearchRow = {
  chunkContent: string;
  chunkContentHash: string;
  chunkCreatedAt: Date;
  chunkEmbeddedAt: Date | null;
  chunkEmbeddingDimension: number | null;
  chunkEmbeddingModel: string | null;
  chunkEmbeddingTaskType: DocumentChunk["embeddingTaskType"];
  chunkEndOffset: number;
  chunkHeadingPath: string[];
  chunkId: string;
  chunkIndex: number;
  chunkMarkdownVersionId: string;
  chunkStartOffset: number;
  chunkTokenCount: number;
  documentCurrentMarkdownVersionId: string | null;
  documentId: string;
  documentProjectId: string;
  documentSourceMetadata: FullTextSearchResponse["results"][number]["document"]["sourceMetadata"];
  documentStatus: FullTextSearchResponse["results"][number]["document"]["status"];
  documentTitle: string | null;
  documentHighlight: string | null;
  projectArchived: boolean;
  projectId: string;
  projectName: string;
  rank: number;
  chunkHighlight: string;
};

function mapChunk(row: FullTextSearchRow): DocumentChunk {
  return documentChunkSchema.parse({
    id: row.chunkId,
    documentId: row.documentId,
    markdownVersionId: row.chunkMarkdownVersionId,
    chunkIndex: row.chunkIndex,
    headingPath: row.chunkHeadingPath,
    content: row.chunkContent,
    contentHash: row.chunkContentHash,
    tokenCount: row.chunkTokenCount,
    markdownOffsets: {
      start: row.chunkStartOffset,
      end: row.chunkEndOffset
    },
    embeddingModel: row.chunkEmbeddingModel,
    embeddingDimension: row.chunkEmbeddingDimension,
    embeddingTaskType: row.chunkEmbeddingTaskType,
    embeddedAt: row.chunkEmbeddedAt ? toIso(row.chunkEmbeddedAt) : null,
    createdAt: toIso(row.chunkCreatedAt)
  });
}

function mapFullTextSearchRow(row: FullTextSearchRow): FullTextSearchResponse["results"][number] {
  return {
    chunk: mapChunk(row),
    document: {
      id: row.documentId,
      projectId: row.documentProjectId,
      title: row.documentTitle,
      status: row.documentStatus,
      sourceMetadata: row.documentSourceMetadata,
      currentMarkdownVersionId: row.documentCurrentMarkdownVersionId
    },
    project: {
      id: row.projectId,
      name: row.projectName,
      archived: row.projectArchived
    },
    rank: row.rank,
    highlights: {
      chunk: sanitizeSearchHighlight(row.chunkHighlight),
      document: row.documentHighlight ? sanitizeSearchHighlight(row.documentHighlight) : null
    }
  };
}

export function sanitizeSearchHighlight(value: string): string {
  return escapeHtml(value)
    .replaceAll(headlineStart, "<mark>")
    .replaceAll(headlineStop, "</mark>");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function searchFullText(
  input: FullTextSearchRequest
): Promise<FullTextSearchResponse> {
  if (input.projectIds && input.projectIds.length === 0) {
    return fullTextSearchResponseSchema.parse({ results: [] });
  }

  const query = input.query.trim();
  const filters: SQL[] = [
    eq(documentChunks.markdownVersionId, documents.currentMarkdownVersionId)
  ];
  const textMatch = or(
    sql`${documentChunks.searchVector} @@ websearch_to_tsquery('simple', ${query})`,
    sql`${documents.searchVector} @@ websearch_to_tsquery('simple', ${query})`
  );

  if (textMatch) {
    filters.push(textMatch);
  }

  if (input.projectIds?.length) {
    filters.push(inArray(projects.id, input.projectIds));
  }

  if (!input.includeArchivedProjects) {
    filters.push(eq(projects.archived, false));
  }

  if (!input.includeDeletedDocuments) {
    filters.push(ne(documents.status, "deleted"));
  }

  if (input.tags.length > 0) {
    filters.push(sql`coalesce(${documents.sourceMetadata}->'tags', '[]'::jsonb) ?| ${input.tags}`);
  }

  if (input.entityNames.length > 0) {
    filters.push(
      sql`coalesce(${documents.sourceMetadata}->'entityNames', '[]'::jsonb) ?| ${input.entityNames}`
    );
  }

  if (input.entityTypes.length > 0) {
    filters.push(
      sql`coalesce(${documents.sourceMetadata}->'entityTypes', '[]'::jsonb) ?| ${input.entityTypes}`
    );
  }

  const rows = await db
    .select({
      chunkContent: documentChunks.content,
      chunkContentHash: documentChunks.contentHash,
      chunkCreatedAt: documentChunks.createdAt,
      chunkEmbeddedAt: documentChunks.embeddedAt,
      chunkEmbeddingDimension: documentChunks.embeddingDimension,
      chunkEmbeddingModel: documentChunks.embeddingModel,
      chunkEmbeddingTaskType: documentChunks.embeddingTaskType,
      chunkEndOffset: documentChunks.endOffset,
      chunkHeadingPath: documentChunks.headingPath,
      chunkId: documentChunks.id,
      chunkIndex: documentChunks.chunkIndex,
      chunkMarkdownVersionId: documentChunks.markdownVersionId,
      chunkStartOffset: documentChunks.startOffset,
      chunkTokenCount: documentChunks.tokenCount,
      documentCurrentMarkdownVersionId: documents.currentMarkdownVersionId,
      documentId: documents.id,
      documentProjectId: documents.projectId,
      documentSourceMetadata: documents.sourceMetadata,
      documentStatus: documents.status,
      documentTitle: documents.title,
      documentHighlight: sql<string | null>`nullif(ts_headline(
        'simple',
        concat_ws(' ', ${documents.title}, ${documents.sourceMetadata}->>'title', ${documents.sourceMetadata}->>'author'),
        websearch_to_tsquery('simple', ${query}),
        ${`StartSel=${headlineStart}, StopSel=${headlineStop}, MaxFragments=2, MinWords=3, MaxWords=12`}
      ), '')`,
      projectArchived: projects.archived,
      projectId: projects.id,
      projectName: projects.name,
      rank: sql<number>`greatest(
        ts_rank_cd(${documentChunks.searchVector}, websearch_to_tsquery('simple', ${query})),
        0
      ) + greatest(
        ts_rank_cd(${documents.searchVector}, websearch_to_tsquery('simple', ${query})) * 0.35,
        0
      )`,
      chunkHighlight: sql<string>`ts_headline(
        'simple',
        ${documentChunks.content},
        websearch_to_tsquery('simple', ${query}),
        ${`StartSel=${headlineStart}, StopSel=${headlineStop}, MaxFragments=2, MinWords=4, MaxWords=18`}
      )`
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .innerJoin(projects, eq(documents.projectId, projects.id))
    .where(and(...filters))
    .orderBy(
      desc(sql`greatest(
        ts_rank_cd(${documentChunks.searchVector}, websearch_to_tsquery('simple', ${query})),
        0
      ) + greatest(
        ts_rank_cd(${documents.searchVector}, websearch_to_tsquery('simple', ${query})) * 0.35,
        0
      )`),
      documentChunks.chunkIndex
    )
    .limit(input.limit);

  return fullTextSearchResponseSchema.parse({
    results: rows.map((row) =>
      mapFullTextSearchRow({
        ...row,
        rank: Number(row.rank)
      })
    )
  });
}
