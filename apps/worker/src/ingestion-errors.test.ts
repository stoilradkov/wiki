import { describe, expect, it } from "vitest";
import { classifyIngestionError } from "@wiki/worker/ingestion-errors";

class ProviderError extends Error {
  code?: string;
  response?: { status?: number; statusText?: string };
  responseBody?: string;
  status?: number;
  statusCode?: number;
}

describe("classifyIngestionError", () => {
  it("labels quota and rate limit failures separately", () => {
    const error = new ProviderError("Gemini request failed");
    error.statusCode = 429;
    error.responseBody = "RESOURCE_EXHAUSTED: quota exceeded";

    expect(classifyIngestionError(error)).toMatchObject({
      code: "quota_exceeded",
      message: "AI quota or rate limit was reached. Retry later.",
      reason: "quota_or_rate_limit",
      retryable: true
    });
  });

  it("treats transient provider statuses as model errors", () => {
    const error = new ProviderError("Gemini model overloaded");
    error.response = { status: 503, statusText: "Service Unavailable" };

    expect(classifyIngestionError(error)).toMatchObject({
      code: "model_error",
      reason: "model",
      retryable: true
    });
  });

  it("keeps validation failures distinct from retryable model failures", () => {
    const error = new Error("Zod validation failed for MarkdownifyResult");

    expect(classifyIngestionError(error)).toMatchObject({
      code: "validation_failed",
      reason: "validation",
      retryable: false
    });
  });
});
