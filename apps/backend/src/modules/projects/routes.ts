import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createProjectRequestSchema,
  listProjectsResponseSchema,
  projectSchema,
  updateProjectRequestSchema
} from "@wiki/shared";
import {
  createProject,
  getProject,
  listProjects,
  updateProject
} from "@wiki/backend/modules/projects/repository";
import { parseBody, parseParams } from "@wiki/backend/routes/helpers";

export const projectParamsSchema = z.object({
  projectId: z.string().uuid()
});

export async function registerProjectRoutes(server: FastifyInstance) {
  server.get("/api/projects", async () =>
    listProjectsResponseSchema.parse({ projects: await listProjects() })
  );

  server.post("/api/projects", async (request, reply) => {
    const body = parseBody(request, createProjectRequestSchema);
    const project = await createProject(body);
    return reply.status(201).send(projectSchema.parse(project));
  });

  server.get("/api/projects/:projectId", async (request, reply) => {
    const { projectId } = parseParams(request, projectParamsSchema);
    const project = await getProject(projectId);

    if (!project) {
      return reply.status(404).send({ error: "not_found", message: "Project not found" });
    }

    return projectSchema.parse(project);
  });

  server.patch("/api/projects/:projectId", async (request, reply) => {
    const { projectId } = parseParams(request, projectParamsSchema);
    const body = parseBody(request, updateProjectRequestSchema);
    const project = await updateProject(projectId, body);

    if (!project) {
      return reply.status(404).send({ error: "not_found", message: "Project not found" });
    }

    return projectSchema.parse(project);
  });
}
