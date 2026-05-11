import { describe, expect, it } from "vitest";
import { normalizeGeminiModelName } from "@wiki/backend/ai/gemini";

describe("normalizeGeminiModelName", () => {
  it("removes the Gemini models prefix when present", () => {
    expect(normalizeGeminiModelName("models/gemini-2.5-flash")).toBe("gemini-2.5-flash");
  });

  it("keeps unprefixed model names unchanged", () => {
    expect(normalizeGeminiModelName("gemini-embedding-001")).toBe("gemini-embedding-001");
  });
});
