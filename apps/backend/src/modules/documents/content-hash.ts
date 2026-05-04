import { createHash } from "node:crypto";

function hashTextContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function hashRawContent(rawContent: string): string {
  return hashTextContent(rawContent);
}

export function hashMarkdown(markdown: string): string {
  return hashTextContent(markdown);
}
