import type { FastifyInstance } from "fastify";
import {
  chatProjectParamsSchema,
  chatThreadDetailSchema,
  chatThreadParamsSchema,
  createChatMessageRequestSchema,
  createChatMessageResponseSchema,
  createChatThreadRequestSchema,
  listChatThreadsResponseSchema
} from "@wiki/shared";
import {
  createChatMessage,
  createChatThread,
  getChatThread,
  listChatThreads
} from "@wiki/backend/modules/chat/repository";
import { getProject } from "@wiki/backend/modules/projects/repository";
import { parseBody, parseParams } from "@wiki/backend/routes/helpers";

export async function registerChatRoutes(server: FastifyInstance) {
  server.get("/api/projects/:projectId/chat/threads", async (request, reply) => {
    const { projectId } = parseParams(request, chatProjectParamsSchema);
    const project = await getProject(projectId);

    if (!project) {
      return reply.status(404).send({ error: "not_found", message: "Project not found" });
    }

    return listChatThreadsResponseSchema.parse({ threads: await listChatThreads(projectId) });
  });

  server.post("/api/projects/:projectId/chat/threads", async (request, reply) => {
    const { projectId } = parseParams(request, chatProjectParamsSchema);
    const body = parseBody(request, createChatThreadRequestSchema);
    const project = await getProject(projectId);

    if (!project) {
      return reply.status(404).send({ error: "not_found", message: "Project not found" });
    }

    const thread = await createChatThread(projectId, body);
    return reply.status(201).send(chatThreadDetailSchema.parse(thread));
  });

  server.get("/api/projects/:projectId/chat/threads/:threadId", async (request, reply) => {
    const { projectId, threadId } = parseParams(request, chatThreadParamsSchema);
    const thread = await getChatThread(projectId, threadId);

    if (!thread) {
      return reply.status(404).send({ error: "not_found", message: "Chat thread not found" });
    }

    return chatThreadDetailSchema.parse(thread);
  });

  server.post(
    "/api/projects/:projectId/chat/threads/:threadId/messages",
    async (request, reply) => {
      const { projectId, threadId } = parseParams(request, chatThreadParamsSchema);
      const body = parseBody(request, createChatMessageRequestSchema);
      const thread = await createChatMessage(projectId, threadId, body);

      if (!thread) {
        return reply.status(404).send({ error: "not_found", message: "Chat thread not found" });
      }

      return reply.status(201).send(createChatMessageResponseSchema.parse({ thread }));
    }
  );
}
