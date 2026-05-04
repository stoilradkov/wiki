import { describe, expect, it } from "vitest";
import { hashMarkdown, hashRawContent } from "@wiki/backend/modules/documents/content-hash";

describe("document content hashes", () => {
  it("generates deterministic SHA-256 hashes for markdown versions", () => {
    const markdown = "# Full Notes\n\n- Detail preserved";

    expect(hashMarkdown(markdown)).toBe(hashMarkdown(markdown));
    expect(hashMarkdown(markdown)).toBe(
      "1a50fdd79cf29128270263c72a0133f009991c835c716670d7994762b52f4b1d"
    );
  });

  it("preserves raw content differences for duplicate checks", () => {
    expect(hashRawContent("Full Notes\nDetail preserved")).toBe(
      "c6802c4959d463985180347419f052fd6366c57167cbef91c37314b69dcd5d2e"
    );
    expect(hashRawContent("Full Notes\nDetail preserved")).not.toBe(
      hashRawContent("Full Notes\nDetail preserved\n")
    );
  });
});
