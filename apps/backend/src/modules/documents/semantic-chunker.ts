export const semanticChunkingDefaults = {
  targetTokens: 700,
  softMaxTokens: 900,
  overlapTokens: 100
};

const atomicBlockHardMaxTokens = semanticChunkingDefaults.softMaxTokens * 2;

export interface SemanticChunk {
  chunkIndex: number;
  headingPath: string[];
  content: string;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
}

interface MarkdownBlock {
  content: string;
  startOffset: number;
  endOffset: number;
  headingPath: string[];
  kind: "code" | "heading" | "list" | "paragraph" | "table";
}

interface HeadingState {
  level: number;
  text: string;
}

export function chunkMarkdownSemantically(markdown: string): SemanticChunk[] {
  const blocks = parseMarkdownBlocks(markdown);
  const chunks: SemanticChunk[] = [];
  let activeBlocks: MarkdownBlock[] = [];

  for (const block of blocks) {
    const nextBlocks = [...activeBlocks, block];
    const nextTokens = countTokens(joinBlocks(nextBlocks));

    if (activeBlocks.length > 0 && nextTokens > semanticChunkingDefaults.softMaxTokens) {
      chunks.push(createChunk(chunks.length, activeBlocks));
      activeBlocks = createOverlapBlocks(activeBlocks);
    }

    if (countTokens(block.content) > semanticChunkingDefaults.softMaxTokens) {
      if (activeBlocks.length > 0) {
        chunks.push(createChunk(chunks.length, activeBlocks));
        activeBlocks = createOverlapBlocks(activeBlocks);
      }
      chunks.push(...splitOversizedBlock(block, chunks.length));
      activeBlocks = [];
      continue;
    }

    activeBlocks.push(block);

    if (countTokens(joinBlocks(activeBlocks)) >= semanticChunkingDefaults.targetTokens) {
      chunks.push(createChunk(chunks.length, activeBlocks));
      activeBlocks = createOverlapBlocks(activeBlocks);
    }
  }

  if (activeBlocks.length > 0) {
    chunks.push(createChunk(chunks.length, activeBlocks));
  }

  return chunks;
}

export function countTokens(content: string): number {
  const words = content.match(/[\p{L}\p{N}_'-]+|[^\s]/gu);
  return Math.max(1, Math.ceil((words?.length ?? 0) * 1.25));
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = getMarkdownLines(markdown);
  const blocks: MarkdownBlock[] = [];
  const headings: HeadingState[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line) break;

    if (line.text.trim() === "") {
      index += 1;
      continue;
    }

    const codeFence = getFenceMarker(line.text);
    if (codeFence) {
      const endIndex = findFenceEnd(lines, index + 1, codeFence);
      blocks.push(createBlock(lines, index, endIndex, [...headings], "code"));
      index = endIndex + 1;
      continue;
    }

    const heading = parseHeading(line.text);
    if (heading) {
      headings.splice(heading.level - 1);
      headings.push(heading);
      blocks.push(createBlock(lines, index, index, [...headings], "heading"));
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const endIndex = findTableEnd(lines, index);
      blocks.push(createBlock(lines, index, endIndex, [...headings], "table"));
      index = endIndex + 1;
      continue;
    }

    if (isListLine(line.text)) {
      const endIndex = findListEnd(lines, index);
      blocks.push(createBlock(lines, index, endIndex, [...headings], "list"));
      index = endIndex + 1;
      continue;
    }

    const endIndex = findParagraphEnd(lines, index);
    blocks.push(createBlock(lines, index, endIndex, [...headings], "paragraph"));
    index = endIndex + 1;
  }

  return blocks;
}

interface MarkdownLine {
  text: string;
  startOffset: number;
  endOffset: number;
}

function getMarkdownLines(markdown: string): MarkdownLine[] {
  const linePattern = /.*(?:\r\n|\n|\r|$)/g;
  const lines: MarkdownLine[] = [];
  let match = linePattern.exec(markdown);

  while (match?.[0] !== undefined && match[0] !== "") {
    lines.push({
      text: match[0],
      startOffset: match.index,
      endOffset: match.index + match[0].length
    });
    match = linePattern.exec(markdown);
  }

  return lines;
}

function getFenceMarker(line: string): string | null {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("```")) return "```";
  if (trimmed.startsWith("~~~")) return "~~~";
  return null;
}

function findFenceEnd(lines: MarkdownLine[], startIndex: number, marker: string): number {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index]?.text.trimStart().startsWith(marker)) return index;
  }
  return lines.length - 1;
}

function parseHeading(line: string): HeadingState | null {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line.trim());
  if (!match) return null;
  const marker = match[1];
  const text = match[2];
  if (!marker || !text) return null;
  return { level: marker.length, text };
}

function isTableStart(lines: MarkdownLine[], index: number): boolean {
  const current = lines[index]?.text.trim();
  const next = lines[index + 1]?.text.trim();
  if (!current || !next) return false;
  return current.includes("|") && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next);
}

function findTableEnd(lines: MarkdownLine[], startIndex: number): number {
  let index = startIndex + 2;
  while (index < lines.length) {
    const text = lines[index]?.text.trim();
    if (!text || !text.includes("|")) break;
    index += 1;
  }
  return index - 1;
}

function isListLine(line: string): boolean {
  return /^(\s*)([-+*]|\d+[.)])\s+/.test(line);
}

function findListEnd(lines: MarkdownLine[], startIndex: number): number {
  let index = startIndex + 1;
  while (index < lines.length) {
    const text = lines[index]?.text ?? "";
    if (text.trim() === "") {
      const next = lines[index + 1]?.text ?? "";
      if (!isListLine(next)) break;
      index += 1;
      continue;
    }
    if (!isListLine(text) && !/^\s{2,}\S/.test(text)) break;
    index += 1;
  }
  return index - 1;
}

function findParagraphEnd(lines: MarkdownLine[], startIndex: number): number {
  let index = startIndex + 1;
  while (index < lines.length) {
    const text = lines[index]?.text ?? "";
    if (text.trim() === "") break;
    if (getFenceMarker(text) || parseHeading(text) || isTableStart(lines, index) || isListLine(text)) {
      break;
    }
    index += 1;
  }
  return index - 1;
}

function createBlock(
  lines: MarkdownLine[],
  startIndex: number,
  endIndex: number,
  headings: HeadingState[],
  kind: MarkdownBlock["kind"]
): MarkdownBlock {
  const startLine = lines[startIndex];
  const endLine = lines[endIndex];
  if (!startLine || !endLine) {
    throw new Error("Invalid markdown block boundaries");
  }

  return {
    content: lines.slice(startIndex, endIndex + 1).map((line) => line.text).join("").trimEnd(),
    endOffset: endLine.endOffset,
    headingPath: headings.map((heading) => heading.text),
    kind,
    startOffset: startLine.startOffset
  };
}

function joinBlocks(blocks: MarkdownBlock[]): string {
  return blocks.map((block) => block.content).join("\n\n").trim();
}

function createChunk(chunkIndex: number, blocks: MarkdownBlock[]): SemanticChunk {
  const content = joinBlocks(blocks);
  const firstBlock = blocks[0];
  const lastBlock = blocks[blocks.length - 1];

  if (!firstBlock || !lastBlock) {
    throw new Error("Cannot create semantic chunk without blocks");
  }

  return {
    chunkIndex,
    content,
    endOffset: lastBlock.endOffset,
    headingPath: lastBlock.headingPath,
    startOffset: firstBlock.startOffset,
    tokenCount: countTokens(content)
  };
}

function createOverlapBlocks(blocks: MarkdownBlock[]): MarkdownBlock[] {
  const overlap: MarkdownBlock[] = [];
  let tokens = 0;

  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (!block) continue;
    const blockTokens = countTokens(block.content);
    if (blockTokens > semanticChunkingDefaults.overlapTokens) break;
    const nextTokens = tokens + blockTokens;
    if (overlap.length > 0 && nextTokens > semanticChunkingDefaults.overlapTokens) break;
    overlap.unshift(block);
    tokens = nextTokens;
  }

  return overlap;
}

function splitOversizedBlock(block: MarkdownBlock, firstIndex: number): SemanticChunk[] {
  if (block.kind === "code" || block.kind === "table") {
    if (countTokens(block.content) > atomicBlockHardMaxTokens) {
      return splitOversizedBlockByLines(block, firstIndex);
    }

    return [createChunk(firstIndex, [block])];
  }

  return splitOversizedTextBlock(block, firstIndex);
}

function splitOversizedBlockByLines(block: MarkdownBlock, firstIndex: number): SemanticChunk[] {
  const lines = getMarkdownLines(block.content);
  const chunks: SemanticChunk[] = [];
  let activeLines: MarkdownLine[] = [];

  for (const line of lines) {
    const nextContent = [...activeLines, line].map((item) => item.text).join("").trim();
    if (activeLines.length > 0 && countTokens(nextContent) > semanticChunkingDefaults.softMaxTokens) {
      chunks.push(createChunkFromLines(firstIndex + chunks.length, block, activeLines));
      activeLines = [];
    }

    activeLines.push(line);
  }

  if (activeLines.length > 0) {
    chunks.push(createChunkFromLines(firstIndex + chunks.length, block, activeLines));
  }

  return chunks;
}

function splitOversizedTextBlock(block: MarkdownBlock, firstIndex: number): SemanticChunk[] {
  const maxWords = Math.max(1, Math.floor(semanticChunkingDefaults.softMaxTokens / 1.25));
  const wordPattern = /\S+/g;
  const chunks: SemanticChunk[] = [];
  let segmentStart = 0;
  let segmentEnd = 0;
  let wordCount = 0;
  let match = wordPattern.exec(block.content);

  while (match?.[0] !== undefined) {
    if (wordCount >= maxWords) {
      chunks.push(
        createChunkFromContentRange(firstIndex + chunks.length, block, segmentStart, segmentEnd)
      );
      segmentStart = match.index;
      wordCount = 0;
    }

    segmentEnd = match.index + match[0].length;
    wordCount += 1;
    match = wordPattern.exec(block.content);
  }

  if (segmentEnd > segmentStart) {
    chunks.push(createChunkFromContentRange(firstIndex + chunks.length, block, segmentStart, segmentEnd));
  }

  if (chunks.length > 0) return chunks;

  const lines = getMarkdownLines(block.content);
  const lineChunks: SemanticChunk[] = [];
  let activeLines: MarkdownLine[] = [];

  for (const line of lines) {
    const nextContent = [...activeLines, line].map((item) => item.text).join("").trim();
    if (
      activeLines.length > 0 &&
      countTokens(nextContent) > semanticChunkingDefaults.softMaxTokens
    ) {
      lineChunks.push(createChunkFromLines(firstIndex + lineChunks.length, block, activeLines));
      activeLines = [];
    }
    activeLines.push(line);
  }

  if (activeLines.length > 0) {
    lineChunks.push(createChunkFromLines(firstIndex + lineChunks.length, block, activeLines));
  }

  return lineChunks;
}

function createChunkFromContentRange(
  chunkIndex: number,
  source: MarkdownBlock,
  start: number,
  end: number
): SemanticChunk {
  const rawContent = source.content.slice(start, end);
  const leadingWhitespaceLength = rawContent.length - rawContent.trimStart().length;
  const trailingWhitespaceLength = rawContent.length - rawContent.trimEnd().length;
  const content = rawContent.trim();

  return {
    chunkIndex,
    content,
    endOffset: source.startOffset + end - trailingWhitespaceLength,
    headingPath: source.headingPath,
    startOffset: source.startOffset + start + leadingWhitespaceLength,
    tokenCount: countTokens(content)
  };
}

function createChunkFromLines(
  chunkIndex: number,
  source: MarkdownBlock,
  lines: MarkdownLine[]
): SemanticChunk {
  const firstLine = lines[0];
  const lastLine = lines[lines.length - 1];
  if (!firstLine || !lastLine) {
    throw new Error("Cannot create semantic chunk without lines");
  }

  const content = lines.map((line) => line.text).join("").trim();
  return {
    chunkIndex,
    content,
    endOffset: source.startOffset + lastLine.endOffset,
    headingPath: source.headingPath,
    startOffset: source.startOffset + firstLine.startOffset,
    tokenCount: countTokens(content)
  };
}
