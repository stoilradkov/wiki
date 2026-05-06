import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerSearchRoutes } from "@wiki/backend/modules/search/routes";

const mocks = vi.hoisted(() => ({
  getProject: vi.fn(),
  searchFullText: vi.fn(),
  searchHybrid: vi.fn()
}));

vi.mock("@wiki/backend/modules/projects/repository", () => ({
  getProject: mocks.getProject
}));

vi.mock("@wiki/backend/modules/search/repository", () => ({
  searchFullText: mocks.searchFullText
}));

vi.mock("@wiki/backend/modules/search/service", () => ({
  searchHybrid: mocks.searchHybrid
}));

describe("search routes", () => {
  beforeEach(() => {
    mocks.getProject.mockReset();
    mocks.searchFullText.mockReset();
    mocks.searchHybrid.mockReset();
  });

  it("forces scoped full-text search to the path project", async () => {
    const pathProjectId = "00000000-0000-4000-8000-00000000000a";
    const bodyProjectId = "00000000-0000-4000-8000-00000000000b";
    const server = Fastify();
    mocks.getProject.mockResolvedValue({ id: pathProjectId });
    mocks.searchFullText.mockResolvedValue({ results: [] });

    await registerSearchRoutes(server);

    const response = await server.inject({
      method: "POST",
      url: `/api/projects/${pathProjectId}/search/full-text`,
      payload: {
        query: "exact acronym",
        projectIds: [bodyProjectId]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.searchFullText).toHaveBeenCalledWith(
      expect.objectContaining({
        projectIds: [pathProjectId],
        query: "exact acronym"
      })
    );

    await server.close();
  });

  it("forces hybrid search to the path project", async () => {
    const pathProjectId = "00000000-0000-4000-8000-00000000000a";
    const bodyProjectId = "00000000-0000-4000-8000-00000000000b";
    const server = Fastify();
    mocks.getProject.mockResolvedValue({ id: pathProjectId });
    mocks.searchHybrid.mockResolvedValue({ results: [] });

    await registerSearchRoutes(server);

    const response = await server.inject({
      method: "POST",
      url: `/api/projects/${pathProjectId}/search`,
      payload: {
        query: "semantic exact",
        projectIds: [bodyProjectId]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.searchHybrid).toHaveBeenCalledWith(
      expect.objectContaining({
        projectIds: [pathProjectId],
        query: "semantic exact"
      })
    );

    await server.close();
  });
});
