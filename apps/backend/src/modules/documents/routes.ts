import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createDocumentRequestSchema,
  documentDetailSchema,
  listDocumentsResponseSchema,
  updateDocumentMetadataRequestSchema
} from "@wiki/shared";
import {
  createDocument,
  getDocument,
  listDocuments,
  updateDocumentMetadata
} from "@wiki/backend/modules/documents/repository";
import { getProject } from "@wiki/backend/modules/projects/repository";
import { projectParamsSchema } from "@wiki/backend/modules/projects/routes";
import { parseBody, parseParams } from "@wiki/backend/routes/helpers";

const documentParamsSchema = projectParamsSchema.extend({
  documentId: z.string().uuid()
});

export async function registerDocumentRoutes(server: FastifyInstance) {
  server.get("/api/projects/:projectId/documents", async (request, reply) => {
    const { projectId } = parseParams(request, projectParamsSchema);

    if (!(await getProject(projectId))) {
      return reply.status(404).send({ error: "not_found", message: "Project not found" });
    }

    return listDocumentsResponseSchema.parse({ documents: await listDocuments(projectId) });
  });

  server.post("/api/projects/:projectId/documents", async (request, reply) => {
    const { projectId } = parseParams(request, projectParamsSchema);
    const project = await getProject(projectId);

    if (!project) {
      return reply.status(404).send({ error: "not_found", message: "Project not found" });
    }

    const body = parseBody(request, createDocumentRequestSchema);
    const document = await createDocument(projectId, project.ingestionMode, body);
    return reply.status(201).send(documentDetailSchema.parse(document));
  });

  server.get("/api/projects/:projectId/documents/:documentId", async (request, reply) => {
    const { projectId, documentId } = parseParams(request, documentParamsSchema);
    const document = await getDocument(projectId, documentId);

    if (!document) {
      return reply.status(404).send({ error: "not_found", message: "Document not found" });
    }

    return documentDetailSchema.parse(document);
  });

  server.patch("/api/projects/:projectId/documents/:documentId", async (request, reply) => {
    const { projectId, documentId } = parseParams(request, documentParamsSchema);
    const body = parseBody(request, updateDocumentMetadataRequestSchema);
    const document = await updateDocumentMetadata(projectId, documentId, body);

    if (!document) {
      return reply.status(404).send({ error: "not_found", message: "Document not found" });
    }

    return documentDetailSchema.parse(document);
  });
}
