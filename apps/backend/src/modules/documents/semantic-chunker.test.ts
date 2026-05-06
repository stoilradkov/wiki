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
});

function createWords(word: string, count: number): string {
  return Array.from({ length: count }, () => word).join(" ");
}
