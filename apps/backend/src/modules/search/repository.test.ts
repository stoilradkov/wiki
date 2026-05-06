import { describe, expect, it } from "vitest";
import { sanitizeSearchHighlight, searchFullText } from "@wiki/backend/modules/search/repository";
import { fullTextSearchRequestSchema } from "@wiki/shared";

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
});
