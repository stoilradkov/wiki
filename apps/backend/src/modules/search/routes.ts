import type { FastifyInstance } from "fastify";
import { fullTextSearchRequestSchema, fullTextSearchResponseSchema } from "@wiki/shared";
import { searchFullText } from "@wiki/backend/modules/search/repository";
import { getProject } from "@wiki/backend/modules/projects/repository";
import { projectParamsSchema } from "@wiki/backend/modules/projects/routes";
import { parseBody, parseParams } from "@wiki/backend/routes/helpers";

const scopedFullTextSearchRequestSchema = fullTextSearchRequestSchema.omit({ projectIds: true });

export async function registerSearchRoutes(server: FastifyInstance) {
  server.post("/api/projects/:projectId/search/full-text", async (request, reply) => {
    const { projectId } = parseParams(request, projectParamsSchema);

    if (!(await getProject(projectId))) {
      return reply.status(404).send({ error: "not_found", message: "Project not found" });
    }

    const body = parseBody(request, scopedFullTextSearchRequestSchema);

    return fullTextSearchResponseSchema.parse(
      await searchFullText({
        ...body,
        projectIds: resolveProjectSearchScope(projectId)
      })
    );
  });
}

export function resolveProjectSearchScope(pathProjectId: string): string[] {
  return [pathProjectId];
}
