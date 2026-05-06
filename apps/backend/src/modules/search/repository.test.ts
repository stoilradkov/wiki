import { describe, expect, it } from "vitest";
import {
  createSearchFilters,
  mergeSearchResultsWithRrf,
  sanitizeSearchHighlight,
  searchFullText
} from "@wiki/backend/modules/search/repository";
import { fullTextSearchRequestSchema, type FullTextSearchResult } from "@wiki/shared";

describe("search result highlights", () => {
  it("escapes source text while preserving backend highlight marks", () => {
    expect(
      sanitizeSearchHighlight(
        'before <script>alert("x")</script> WIKI_SEARCH_MARK_STARTtermWIKI_SEARCH_MARK_STOP & after'
      )
    ).toBe(
      "before &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; <mark>term</mark> &amp; after"
    );
  });

  it("returns no results for an explicit empty project scope", async () => {
    await expect(
      searchFullText(fullTextSearchRequestSchema.parse({ query: "anything", projectIds: [] }))
    ).resolves.toEqual({ results: [] });
  });

  it("adds repository filters for document status and source date range", () => {
    const baseFilters = createSearchFilters(
      fullTextSearchRequestSchema.parse({ query: "anything" })
    );
    const filteredSearch = fullTextSearchRequestSchema.parse({
      query: "anything",
      documentStatuses: ["ready"],
      sourceDateFrom: "2026-01-01",
      sourceDateTo: "2026-12-31"
    });

    expect(createSearchFilters(filteredSearch)).toHaveLength(baseFilters.length + 3);
  });

  it("merges semantic and full-text rankings with reciprocal rank fusion", () => {
    const fullTextResults = [createSearchResult("chunk-a", 0), createSearchResult("chunk-b", 1)];
    const semanticResults = [createSearchResult("chunk-b", 1), createSearchResult("chunk-c", 2)];

    const merged = mergeSearchResultsWithRrf(fullTextResults, semanticResults, 10);

    expect(merged.results.map((result) => result.chunk.id)).toEqual([
      "00000000-0000-4000-8000-00000000000b",
      "00000000-0000-4000-8000-00000000000a",
      "00000000-0000-4000-8000-00000000000c"
    ]);
    expect(merged.results[0]?.matchRanks).toEqual({ fullText: 2, semantic: 1 });
    expect(merged.results[1]?.matchRanks).toEqual({ fullText: 1, semantic: null });
  });
});

function createSearchResult(
  idSeed: "chunk-a" | "chunk-b" | "chunk-c",
  chunkIndex: number
): FullTextSearchResult {
  const chunkIdBySeed = {
    "chunk-a": "00000000-0000-4000-8000-00000000000a",
    "chunk-b": "00000000-0000-4000-8000-00000000000b",
    "chunk-c": "00000000-0000-4000-8000-00000000000c"
  };

  return {
    chunk: {
      id: chunkIdBySeed[idSeed],
      documentId: "10000000-0000-4000-8000-000000000000",
      markdownVersionId: "20000000-0000-4000-8000-000000000000",
      chunkIndex,
      headingPath: ["Heading"],
      content: `Content ${idSeed}`,
      contentHash: `hash-${idSeed}`,
      tokenCount: 2,
      markdownOffsets: {
        start: chunkIndex * 10,
        end: chunkIndex * 10 + 9
      },
      embeddingModel: "gemini-embedding-2",
      embeddingDimension: 768,
      embeddingTaskType: "RETRIEVAL_DOCUMENT",
      embeddedAt: "2026-05-06T00:00:00.000Z",
      createdAt: "2026-05-06T00:00:00.000Z"
    },
    document: {
      id: "10000000-0000-4000-8000-000000000000",
      projectId: "30000000-0000-4000-8000-000000000000",
      title: "Doc",
      status: "ready",
      sourceMetadata: {},
      currentMarkdownVersionId: "20000000-0000-4000-8000-000000000000"
    },
    project: {
      id: "30000000-0000-4000-8000-000000000000",
      name: "Project",
      archived: false
    },
    rank: 1,
    highlights: {
      chunk: `Content ${idSeed}`,
      document: null
    }
  };
}
