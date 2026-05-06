import { describe, expect, it } from "vitest";
import {
  createPublicAiSettings,
  createAppInfo,
  healthResponseSchema,
  packageName,
  parseBackendEnv,
  parseWorkerEnv
} from "@wiki/shared";

describe("shared bootstrap contracts", () => {
  it("creates typed app info", () => {
    expect(createAppInfo()).toEqual({
      name: packageName,
      version: "0.1.0"
    });
  });

  it("validates the backend health response shape", () => {
    expect(
      healthResponseSchema.parse({
        ok: true,
        service: "backend",
        app: createAppInfo()
      })
    ).toEqual({
      ok: true,
      service: "backend",
      app: {
        name: packageName,
        version: "0.1.0"
      }
    });
  });

  it("validates backend environment defaults and coercion", () => {
    expect(parseBackendEnv({ PORT: "4321" })).toMatchObject({
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 4321,
      DATABASE_URL: "postgresql://wiki:wiki@127.0.0.1:5432/wiki",
      REDIS_URL: "redis://127.0.0.1:6379"
    });
  });

  it("normalizes blank optional secrets", () => {
    expect(parseWorkerEnv({ GEMINI_API_KEY: "" })).toEqual({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://wiki:wiki@127.0.0.1:5432/wiki",
      REDIS_URL: "redis://127.0.0.1:6379",
      GEMINI_API_KEY: undefined,
      AI_PROVIDER: "gemini",
      AI_GENERATION_MODEL: "gemini-3.1-flash-lite-preview",
      AI_EMBEDDING_MODEL: "gemini-embedding-2",
      AI_EMBEDDING_DIMENSION: 768,
      AI_THINKING_BUDGET_MARKDOWNIFY: 256,
      AI_THINKING_BUDGET_EXTRACTION: 256,
      AI_THINKING_BUDGET_CHAT: 512,
      AI_EMBEDDING_BATCH_SIZE: 16,
      WORKER_RETRY_COUNT: 3,
      WORKER_CONCURRENCY: 1
    });
  });

  it("coerces configurable AI model budgets and worker limits", () => {
    expect(
      parseBackendEnv({
        AI_GENERATION_MODEL: "gemini-2.5-pro",
        AI_EMBEDDING_MODEL: "gemini-embedding-001",
        AI_EMBEDDING_DIMENSION: "1024",
        AI_THINKING_BUDGET_MARKDOWNIFY: "0",
        AI_THINKING_BUDGET_EXTRACTION: "64",
        AI_THINKING_BUDGET_CHAT: "128",
        AI_EMBEDDING_BATCH_SIZE: "8",
        WORKER_RETRY_COUNT: "5",
        WORKER_CONCURRENCY: "2"
      })
    ).toMatchObject({
      AI_GENERATION_MODEL: "gemini-2.5-pro",
      AI_EMBEDDING_MODEL: "gemini-embedding-001",
      AI_EMBEDDING_DIMENSION: 1024,
      AI_THINKING_BUDGET_MARKDOWNIFY: 0,
      AI_THINKING_BUDGET_EXTRACTION: 64,
      AI_THINKING_BUDGET_CHAT: 128,
      AI_EMBEDDING_BATCH_SIZE: 8,
      WORKER_RETRY_COUNT: 5,
      WORKER_CONCURRENCY: 2
    });
  });

  it("creates public AI settings without exposing secrets", () => {
    const settings = createPublicAiSettings(
      parseBackendEnv({
        GEMINI_API_KEY: "super-secret"
      })
    );

    expect(settings).toEqual({
      provider: "gemini",
      generationModel: "gemini-3.1-flash-lite-preview",
      embeddingModel: "gemini-embedding-2",
      embeddingDimension: 768,
      thinkingBudgets: {
        markdownify: 256,
        extraction: 256,
        chat: 512
      },
      embeddingBatchSize: 16,
      workerRetryCount: 3,
      workerConcurrency: 1,
      secretStatus: "configured"
    });
    expect(JSON.stringify(settings)).not.toContain("super-secret");
  });
});
