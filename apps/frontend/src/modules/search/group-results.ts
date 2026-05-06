import type { HybridSearchResult } from "@wiki/shared";

export type DocumentResultGroup = {
  document: HybridSearchResult["document"];
  project: HybridSearchResult["project"];
  results: HybridSearchResult[];
};

export function groupResultsByDocument(results: HybridSearchResult[]): DocumentResultGroup[] {
  const groups = new Map<string, DocumentResultGroup>();

  results.forEach((result) => {
    const group = groups.get(result.document.id);
    if (group) {
      group.results.push(result);
      return;
    }

    groups.set(result.document.id, {
      document: result.document,
      project: result.project,
      results: [result]
    });
  });

  return [...groups.values()];
}
