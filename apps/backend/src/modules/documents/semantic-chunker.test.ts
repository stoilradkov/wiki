import { describe, expect, it } from "vitest";
import {
  chunkMarkdownSemantically,
  countTokens,
  semanticChunkingDefaults
} from "@wiki/backend/modules/documents/semantic-chunker";

describe("chunkMarkdownSemantically", () => {
  it("keeps heading paths and markdown offsets", () => {
    const markdown = "# Root\n\nIntro paragraph.\n\n## Detail\n\nUseful detail here.";
    const chunks = chunkMarkdownSemantically(markdown);
    const firstChunk = chunks[0];

    expect(firstChunk).toBeDefined();
    expect(firstChunk?.headingPath).toEqual(["Root", "Detail"]);
    expect(firstChunk?.chunkIndex).toBe(0);
    expect(firstChunk?.startOffset).toBe(0);
    expect(firstChunk?.endOffset).toBe(markdown.length);
    expect(markdown.slice(firstChunk?.startOffset, firstChunk?.endOffset)).toContain(
      "Useful detail here."
    );
  });

  it("uses markdown structure before token fallback", () => {
    const firstSection = createWords("alpha", 580);
    const secondSection = createWords("beta", 580);
    const markdown = `# Alpha\n\n${firstSection}\n\n# Beta\n\n${secondSection}`;
    const chunks = chunkMarkdownSemantically(markdown);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]?.content).toContain("# Alpha");
    expect(chunks[0]?.content).not.toContain("# Beta");
    expect(chunks[1]?.content).toContain("# Beta");
    expect(chunks[1]?.headingPath).toEqual(["Beta"]);
  });

  it("keeps fenced code blocks and tables intact unless oversized", () => {
    const markdown = [
      "# Notes",
      "",
      "```ts",
      "const answer = 42;",
      "console.log(answer);",
      "```",
      "",
      "| Name | Value |",
      "| --- | --- |",
      "| Alpha | Beta |"
    ].join("\n");
    const chunks = chunkMarkdownSemantically(markdown);
    const combined = chunks.map((chunk) => chunk.content).join("\n\n");

    expect(combined).toContain("```ts\nconst answer = 42;\nconsole.log(answer);\n```");
    expect(combined).toContain("| Name | Value |\n| --- | --- |\n| Alpha | Beta |");
  });

  it("splits code blocks beyond the hard token cap by line boundaries", () => {
    const largeCodeLines = Array.from(
      { length: 320 },
      (_, index) => `const value${index} = "${createWords("token", 5)}";`
    );
    const markdown = ["# Big Code", "", "```ts", ...largeCodeLines, "```"].join("\n");
    const chunks = chunkMarkdownSemantically(markdown);
    const codeChunks = chunks.filter((chunk) => chunk.content.includes("const value"));
    const respectsSoftCap = codeChunks.every(
      (chunk) => chunk.tokenCount <= semanticChunkingDefaults.softMaxTokens + 50
    );

    expect(codeChunks.length).toBeGreaterThan(1);
    expect(respectsSoftCap).toBe(true);
    expect(codeChunks.every((chunk) => chunk.content.includes("\n"))).toBe(true);
  });

  it("splits oversized single-line unclosed code fences", () => {
    const largeMinifiedExport = `export const value = {${Array.from(
      { length: 2_000 },
      (_, index) => `"key${index}":"value${index}"`
    ).join(",")}};`;
    const markdown = ["# Broken Export", "", "```ts", largeMinifiedExport].join("\n");
    const chunks = chunkMarkdownSemantically(markdown);
    const codeChunks = chunks.filter((chunk) => chunk.content.includes("key"));
    const hardMaxTokens = semanticChunkingDefaults.softMaxTokens * 2;

    expect(codeChunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.tokenCount <= hardMaxTokens)).toBe(true);
  });

  it("splits large tables beyond the hard token cap by line boundaries", () => {
    const tableRows = Array.from(
      { length: 360 },
      (_, index) => `| ${index} | ${createWords("cell", 5)} |`
    );
    const markdown = ["# Big Table", "", "| Id | Content |", "| --- | --- |", ...tableRows].join("\n");
    const chunks = chunkMarkdownSemantically(markdown);
    const tableChunks = chunks.filter((chunk) => chunk.content.includes("|"));
    const respectsSoftCap = tableChunks.every(
      (chunk) => chunk.tokenCount <= semanticChunkingDefaults.softMaxTokens + 50
    );

    expect(tableChunks.length).toBeGreaterThan(1);
    expect(respectsSoftCap).toBe(true);
  });

  it("uses documented default token targets", () => {
    expect(semanticChunkingDefaults).toEqual({
      targetTokens: 700,
      softMaxTokens: 900,
      overlapTokens: 100
    });
  });

  it("splits oversized paragraphs by token fallback", () => {
    const markdown = `# Big\n\n${createWords("detail", 2_000)}`;
    const chunks = chunkMarkdownSemantically(markdown);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => countTokens(chunk.content) <= 920)).toBe(true);
  });

  it("overlaps oversized paragraph splits", () => {
    const words = Array.from({ length: 1_600 }, (_, index) => `word${index}`);
    const markdown = `# Big\n\n${words.join(" ")}`;
    const chunks = chunkMarkdownSemantically(markdown);
    const paragraphChunks = chunks.filter((chunk) => chunk.content.includes("word"));
    const firstChunkWords = paragraphChunks[0]?.content.split(/\s+/) ?? [];
    const secondChunkWords = paragraphChunks[1]?.content.split(/\s+/) ?? [];
    const overlapWordCount = Math.floor(semanticChunkingDefaults.overlapTokens / 1.25);

    expect(paragraphChunks.length).toBeGreaterThan(1);
    expect(secondChunkWords.slice(0, overlapWordCount)).toEqual(
      firstChunkWords.slice(-overlapWordCount)
    );
  });

  it("falls back to heading overlap when the last block exceeds overlap tokens", () => {
    const largeCode = createWords("token", 120);
    const nextSection = createWords("detail", 650);
    const markdown = ["# Guide", "", "```ts", largeCode, "```", "", nextSection].join("\n");
    const chunks = chunkMarkdownSemantically(markdown);
    const detailChunk = chunks.find((chunk) => chunk.content.includes("detail"));

    expect(chunks[0]?.content).toContain("```ts");
    expect(countTokens(chunks[0]?.content ?? "")).toBeGreaterThan(
      semanticChunkingDefaults.overlapTokens
    );
    expect(detailChunk?.content).toContain("# Guide");
    expect(detailChunk?.headingPath).toEqual(["Guide"]);
  });

  it("uses the latest heading stack when duplicate heading text exists", () => {
    const largeCode = createWords("token", 120);
    const nextSection = createWords("detail", 650);
    const markdown = [
      "# API",
      "",
      "## Usage",
      "",
      "Old usage notes.",
      "",
      "# CLI",
      "",
      "## Usage",
      "",
      "```ts",
      largeCode,
      "```",
      "",
      nextSection
    ].join("\n");
    const chunks = chunkMarkdownSemantically(markdown);
    const detailChunk = chunks.find((chunk) => chunk.content.includes("detail"));

    expect(detailChunk?.content).toContain("# CLI");
    expect(detailChunk?.content).toContain("## Usage");
    expect(detailChunk?.content).not.toContain("# API");
    expect(detailChunk?.content).not.toContain("Old usage notes.");
    expect(detailChunk?.headingPath).toEqual(["CLI", "Usage"]);
  });
});

function createWords(word: string, count: number): string {
  return Array.from({ length: count }, () => word).join(" ");
}
