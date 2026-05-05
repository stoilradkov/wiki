import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  checkDuplicateDocumentRequestSchema,
  createDocumentRequestSchema,
  documentActionResponseSchema,
  documentDetailSchema,
  duplicateDocumentResponseSchema,
  listMarkdownVersionsResponseSchema,
  listDocumentsResponseSchema,
  updateDocumentMarkdownRequestSchema,
  updateDocumentMetadataRequestSchema,
  type DocumentDetail
} from "@wiki/shared";
import {
  findDuplicateDocument,
  getDocument,
  listMarkdownVersions,
  listDocuments,
  updateDocumentMarkdown,
  updateDocumentMetadata
} from "@wiki/backend/modules/documents/repository";
import {
  approveDocumentReview,
  createDocumentAndEnqueueIngestion,
  DocumentActionConflictError,
  reprocessCurrentMarkdown,
  retryFailedDocumentIngestion,
  rerunDocumentMarkdownify
} from "@wiki/backend/modules/documents/service";
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
    const document = await createDocumentAndEnqueueIngestion(
      projectId,
      project.ingestionMode,
      body
    );
    return reply.status(201).send(documentDetailSchema.parse(document));
  });

  server.post("/api/projects/:projectId/documents/duplicates/check", async (request, reply) => {
    const { projectId } = parseParams(request, projectParamsSchema);

    if (!(await getProject(projectId))) {
      return reply.status(404).send({ error: "not_found", message: "Project not found" });
    }

    const body = parseBody(request, checkDuplicateDocumentRequestSchema);
    return duplicateDocumentResponseSchema.parse(await findDuplicateDocument(projectId, body));
  });

  server.get("/api/projects/:projectId/documents/:documentId", async (request, reply) => {
    const { projectId, documentId } = parseParams(request, documentParamsSchema);
    const document = await getDocument(projectId, documentId);

    if (!document) {
      return reply.status(404).send({ error: "not_found", message: "Document not found" });
    }

    return documentDetailSchema.parse(document);
  });

  server.get(
    "/api/projects/:projectId/documents/:documentId/markdown/versions",
    async (request, reply) => {
      const { projectId, documentId } = parseParams(request, documentParamsSchema);
      const document = await getDocument(projectId, documentId);

      if (!document) {
        return reply.status(404).send({ error: "not_found", message: "Document not found" });
      }

      return listMarkdownVersionsResponseSchema.parse(
        await listMarkdownVersions(projectId, documentId)
      );
    }
  );

  server.patch("/api/projects/:projectId/documents/:documentId", async (request, reply) => {
    const { projectId, documentId } = parseParams(request, documentParamsSchema);
    const body = parseBody(request, updateDocumentMetadataRequestSchema);
    const document = await updateDocumentMetadata(projectId, documentId, body);

    if (!document) {
      return reply.status(404).send({ error: "not_found", message: "Document not found" });
    }

    return documentDetailSchema.parse(document);
  });

  server.put("/api/projects/:projectId/documents/:documentId/markdown", async (request, reply) => {
    const { projectId, documentId } = parseParams(request, documentParamsSchema);
    const body = parseBody(request, updateDocumentMarkdownRequestSchema);
    const document = await updateDocumentMarkdown(projectId, documentId, body);

    if (!document) {
      return reply.status(404).send({ error: "not_found", message: "Document not found" });
    }

    return documentDetailSchema.parse(document);
  });

  server.post(
    "/api/projects/:projectId/documents/:documentId/review/approve",
    async (request, reply) => {
      const { projectId, documentId } = parseParams(request, documentParamsSchema);
      const document = await runDocumentAction(reply, () =>
        approveDocumentReview(projectId, documentId)
      );

      if (document.status === "conflict") return;

      if (!document.document) {
        return reply.status(404).send({ error: "not_found", message: "Document not found" });
      }

      return documentActionResponseSchema.parse({ document: document.document });
    }
  );

  server.post(
    "/api/projects/:projectId/documents/:documentId/markdown/rerun",
    async (request, reply) => {
      const { projectId, documentId } = parseParams(request, documentParamsSchema);
      const document = await runDocumentAction(reply, () =>
        rerunDocumentMarkdownify(projectId, documentId)
      );

      if (document.status === "conflict") return;

      if (!document.document) {
        return reply.status(404).send({ error: "not_found", message: "Document not found" });
      }

      return documentActionResponseSchema.parse({ document: document.document });
    }
  );

  server.post(
    "/api/projects/:projectId/documents/:documentId/markdown/reprocess",
    async (request, reply) => {
      const { projectId, documentId } = parseParams(request, documentParamsSchema);
      const document = await runDocumentAction(reply, () =>
        reprocessCurrentMarkdown(projectId, documentId)
      );

      if (document.status === "conflict") return;

      if (!document.document) {
        return reply.status(404).send({ error: "not_found", message: "Document not found" });
      }

      return documentActionResponseSchema.parse({ document: document.document });
    }
  );

  server.post("/api/projects/:projectId/documents/:documentId/retry", async (request, reply) => {
    const { projectId, documentId } = parseParams(request, documentParamsSchema);
    const document = await runDocumentAction(reply, () =>
      retryFailedDocumentIngestion(projectId, documentId)
    );

    if (document.status === "conflict") return;

    if (!document.document) {
      return reply.status(404).send({ error: "not_found", message: "Document not found" });
    }

    return documentActionResponseSchema.parse({ document: document.document });
  });
}

type DocumentActionResult =
  | { document: DocumentDetail | null; status: "ok" }
  | { status: "conflict" };

async function runDocumentAction(
  reply: FastifyReply,
  action: () => Promise<DocumentDetail | null>
): Promise<DocumentActionResult> {
  try {
    return { document: await action(), status: "ok" };
  } catch (error) {
    if (error instanceof DocumentActionConflictError) {
      void reply.status(409).send({ error: "conflict", message: error.message });
      return { status: "conflict" };
    }

    throw error;
  }
}
