import type { Document } from "@wiki/shared";

export type IngestionErrorClassification = {
  code: NonNullable<Document["errorCode"]>;
  message: string;
  retryable: boolean;
  reason: string;
};

const quotaIndicators = [
  "quota",
  "rate limit",
  "rate-limit",
  "ratelimit",
  "resource_exhausted",
  "too many requests",
  "429"
];

const validationIndicators = ["validation", "zod", "invalid output", "schema"];
const embeddingIndicators = ["embed", "embedding"];
const databaseIndicators = ["database", "postgres", "db update", "connection refused"];
const modelIndicators = [
  "gemini",
  "model",
  "google generative ai",
  "overloaded",
  "unavailable",
  "timeout",
  "temporarily",
  "503",
  "502",
  "504"
];

export function classifyIngestionError(error: Error): IngestionErrorClassification {
  const normalized = collectErrorText(error).toLowerCase();
  const status = readStatusCode(error);

  if (status === 429 || includesAny(normalized, quotaIndicators)) {
    return {
      code: "quota_exceeded",
      message: "AI quota or rate limit was reached. Retry later.",
      retryable: true,
      reason: "quota_or_rate_limit"
    };
  }

  if (includesAny(normalized, validationIndicators)) {
    return {
      code: "validation_failed",
      message: "Generated content did not match the expected format. Retry ingestion.",
      retryable: false,
      reason: "validation"
    };
  }

  if (includesAny(normalized, embeddingIndicators)) {
    return {
      code: "embedding_failed",
      message: "Embedding generation failed. Retry ingestion.",
      retryable: true,
      reason: "embedding"
    };
  }

  if (includesAny(normalized, databaseIndicators)) {
    return {
      code: "database_error",
      message: "Database update failed during ingestion. Retry after the service recovers.",
      retryable: true,
      reason: "database"
    };
  }

  if (isTransientHttpStatus(status) || includesAny(normalized, modelIndicators)) {
    return {
      code: "model_error",
      message: "AI model request failed. Retry ingestion.",
      retryable: true,
      reason: "model"
    };
  }

  return {
    code: "unknown_error",
    message: "Ingestion failed unexpectedly. Retry ingestion.",
    retryable: false,
    reason: "unknown"
  };
}

function collectErrorText(error: Error): string {
  return [
    error.name,
    error.message,
    readStringProperty(error, "code"),
    readStringProperty(error, "statusText"),
    readStringProperty(error, "responseBody"),
    readNestedStringProperty(error, "cause", "message"),
    readNestedStringProperty(error, "data", "error"),
    readNestedStringProperty(error, "response", "statusText")
  ]
    .filter((value) => value.length > 0)
    .join(" ");
}

function readStatusCode(error: Error): number | null {
  return (
    readNumberProperty(error, "statusCode") ??
    readNumberProperty(error, "status") ??
    readNestedNumberProperty(error, "response", "status") ??
    null
  );
}

function isTransientHttpStatus(status: number | null): boolean {
  return status !== null && [408, 500, 502, 503, 504].includes(status);
}

function includesAny(value: string, indicators: Array<string>): boolean {
  return indicators.some((indicator) => value.includes(indicator));
}

function readStringProperty(value: unknown, key: string): string {
  if (!isRecord(value) || !(key in value)) return "";
  const property = value[key];
  return typeof property === "string" ? property : "";
}

function readNumberProperty(value: unknown, key: string): number | null {
  if (!isRecord(value) || !(key in value)) return null;
  const property = value[key];
  return typeof property === "number" ? property : null;
}

function readNestedStringProperty(value: unknown, parentKey: string, childKey: string): string {
  if (!isRecord(value) || !(parentKey in value)) return "";
  const parent = value[parentKey];
  if (!isRecord(parent) || !(childKey in parent)) return "";
  const property = parent[childKey];
  return typeof property === "string" ? property : "";
}

function readNestedNumberProperty(value: unknown, parentKey: string, childKey: string): number | null {
  if (!isRecord(value) || !(parentKey in value)) return null;
  const parent = value[parentKey];
  if (!isRecord(parent) || !(childKey in parent)) return null;
  const property = parent[childKey];
  return typeof property === "number" ? property : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
