import { db } from "@wiki/backend/db/client";
import { documentChunks, documents, projects } from "@wiki/backend/db/schema";
import {
  documentChunkSchema,
  fullTextSearchResponseSchema,
  hybridSearchResponseSchema,
  type DocumentChunk,
  type EmbeddingTaskType,
  type FullTextSearchRequest,
  type FullTextSearchResponse,
  type HybridSearchRequest,
  type HybridSearchResponse
} from "@wiki/shared";
import { and, asc, desc, eq, inArray, isNotNull, ne, or, sql, type SQL } from "drizzle-orm";

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
  chunkEmbeddingStatus: DocumentChunk["embeddingStatus"];
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

type VectorSearchRow = Omit<FullTextSearchRow, "chunkHighlight" | "documentHighlight" | "rank"> & {
  distance: number;
};

function resolveChunkEmbeddingStatus(
  row: Pick<FullTextSearchRow, "chunkEmbeddedAt" | "chunkEmbeddingStatus">
): DocumentChunk["embeddingStatus"] {
  if (row.chunkEmbeddingStatus === "failed") return "failed";
  if (row.chunkEmbeddingStatus === "completed" || row.chunkEmbeddedAt) return "completed";
  return "pending";
}

function mapChunk(row: FullTextSearchRow | VectorSearchRow): DocumentChunk {
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
    embeddingStatus: resolveChunkEmbeddingStatus(row),
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
  return escapeHtml(value).replaceAll(headlineStart, "<mark>").replaceAll(headlineStop, "</mark>");
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
  const filters = createSearchFilters(input, query);

  const rows = await db
    .select({
      chunkContent: documentChunks.content,
      chunkContentHash: documentChunks.contentHash,
      chunkCreatedAt: documentChunks.createdAt,
      chunkEmbeddedAt: documentChunks.embeddedAt,
      chunkEmbeddingDimension: documentChunks.embeddingDimension,
      chunkEmbeddingModel: documentChunks.embeddingModel,
      chunkEmbeddingStatus: documentChunks.embeddingStatus,
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

export async function searchVector(
  input: HybridSearchRequest,
  queryEmbedding: number[],
  metadata: {
    dimension: number;
    model: string;
    taskType: EmbeddingTaskType;
  }
): Promise<FullTextSearchResponse> {
  if (input.projectIds && input.projectIds.length === 0) {
    return fullTextSearchResponseSchema.parse({ results: [] });
  }

  const queryVector = `[${queryEmbedding.join(",")}]`;
  const filters = createSearchFilters(input);
  filters.push(isNotNull(documentChunks.embedding));
  filters.push(eq(documentChunks.embeddingModel, metadata.model));
  filters.push(eq(documentChunks.embeddingDimension, metadata.dimension));
  filters.push(eq(documentChunks.embeddingTaskType, metadata.taskType));

  const rows = await db
    .select({
      chunkContent: documentChunks.content,
      chunkContentHash: documentChunks.contentHash,
      chunkCreatedAt: documentChunks.createdAt,
      chunkEmbeddedAt: documentChunks.embeddedAt,
      chunkEmbeddingDimension: documentChunks.embeddingDimension,
      chunkEmbeddingModel: documentChunks.embeddingModel,
      chunkEmbeddingStatus: documentChunks.embeddingStatus,
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
      projectArchived: projects.archived,
      projectId: projects.id,
      projectName: projects.name,
      distance: sql<number>`${documentChunks.embedding} <=> ${queryVector}::vector`
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .innerJoin(projects, eq(documents.projectId, projects.id))
    .where(and(...filters))
    .orderBy(
      asc(sql`${documentChunks.embedding} <=> ${queryVector}::vector`),
      documentChunks.chunkIndex
    )
    .limit(input.limit);

  return fullTextSearchResponseSchema.parse({
    results: rows.map((row) => mapVectorSearchRow(row))
  });
}

function mapVectorSearchRow(row: VectorSearchRow): FullTextSearchResponse["results"][number] {
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
    rank: Math.max(0, 1 - Number(row.distance)),
    highlights: {
      chunk: escapeHtml(createSnippet(row.chunkContent)),
      document: null
    }
  };
}

export function createSearchFilters(input: FullTextSearchRequest, query?: string): SQL[] {
  const filters: SQL[] = [eq(documentChunks.markdownVersionId, documents.currentMarkdownVersionId)];

  if (query) {
    const textMatch = or(
      sql`${documentChunks.searchVector} @@ websearch_to_tsquery('simple', ${query})`,
      sql`${documents.searchVector} @@ websearch_to_tsquery('simple', ${query})`
    );

    if (textMatch) {
      filters.push(textMatch);
    }
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

  if (input.documentStatuses.length > 0) {
    filters.push(inArray(documents.status, input.documentStatuses));
  }

  if (input.sourceDateFrom) {
    filters.push(sql`${documents.sourceMetadata}->>'sourceDate' >= ${input.sourceDateFrom}`);
  }

  if (input.sourceDateTo) {
    filters.push(sql`${documents.sourceMetadata}->>'sourceDate' <= ${input.sourceDateTo}`);
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

  return filters;
}

function createSnippet(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 220) return normalized;
  return `${normalized.slice(0, 217)}...`;
}

export function mergeSearchResultsWithRrf(
  fullTextResults: FullTextSearchResponse["results"],
  semanticResults: FullTextSearchResponse["results"],
  limit: number
): HybridSearchResponse {
  const scores = new Map<
    string,
    {
      fullTextRank: number | null;
      result: FullTextSearchResponse["results"][number];
      score: number;
      semanticRank: number | null;
    }
  >();

  addRankedResults(scores, fullTextResults, "fullTextRank");
  addRankedResults(scores, semanticResults, "semanticRank");

  return hybridSearchResponseSchema.parse({
    results: [...scores.values()]
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.result.chunk.chunkIndex - right.result.chunk.chunkIndex;
      })
      .slice(0, limit)
      .map((entry) => ({
        ...entry.result,
        rank: entry.score,
        matchRanks: {
          fullText: entry.fullTextRank,
          semantic: entry.semanticRank
        }
      }))
  });
}

function addRankedResults(
  scores: Map<
    string,
    {
      fullTextRank: number | null;
      result: FullTextSearchResponse["results"][number];
      score: number;
      semanticRank: number | null;
    }
  >,
  results: FullTextSearchResponse["results"],
  rankKey: "fullTextRank" | "semanticRank"
): void {
  const rrfK = 60;

  results.forEach((result, index) => {
    const rank = index + 1;
    const existing = scores.get(result.chunk.id);
    const entry = existing ?? {
      fullTextRank: null,
      result,
      score: 0,
      semanticRank: null
    };

    entry[rankKey] = rank;
    entry.score += 1 / (rrfK + rank);
    scores.set(result.chunk.id, entry);
  });
}
