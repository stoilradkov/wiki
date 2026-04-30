import { describe, expect, it } from "vitest";
import {
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
      GEMINI_API_KEY: undefined
    });
  });
});
