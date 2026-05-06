import { embedSearchQuery } from "@wiki/backend/modules/search/query-embedding";
import {
  mergeSearchResultsWithRrf,
  searchFullText,
  searchVector
} from "@wiki/backend/modules/search/repository";
import { env } from "@wiki/backend/env";
import type { EmbeddingTaskType, HybridSearchRequest, HybridSearchResponse } from "@wiki/shared";

export async function searchHybrid(input: HybridSearchRequest): Promise<HybridSearchResponse> {
  const queryEmbedding = await embedSearchQuery(input.query);
  const embeddingMetadata: {
    dimension: number;
    model: string;
    taskType: EmbeddingTaskType;
  } = {
    dimension: env.AI_EMBEDDING_DIMENSION,
    model: env.AI_EMBEDDING_MODEL,
    taskType: "RETRIEVAL_DOCUMENT"
  };
  const [fullTextResults, semanticResults] = await Promise.all([
    searchFullText(input),
    searchVector(input, queryEmbedding, embeddingMetadata)
  ]);

  return mergeSearchResultsWithRrf(fullTextResults.results, semanticResults.results, input.limit);
}
