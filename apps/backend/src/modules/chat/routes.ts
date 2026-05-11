import type { FastifyInstance, FastifyReply } from "fastify";
import {
  chatCompletedEventSchema,
  chatErrorEventSchema,
  chatProjectParamsSchema,
  chatStreamParamsSchema,
  chatTokenEventSchema,
  chatThreadDetailSchema,
  chatThreadParamsSchema,
  createChatMessageRequestSchema,
  createChatMessageResponseSchema,
  createChatThreadRequestSchema,
  listChatThreadsResponseSchema
} from "@wiki/shared";
import {
  createChatThread,
  getChatThread,
  listChatThreads
} from "@wiki/backend/modules/chat/repository";
import {
  createPendingGroundedChatMessage,
  streamGroundedChatMessage
} from "@wiki/backend/modules/chat/service";
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
      const pending = await createPendingGroundedChatMessage(projectId, threadId, body);

      if (!pending) {
        return reply.status(404).send({ error: "not_found", message: "Chat thread not found" });
      }

      return reply.status(201).send(createChatMessageResponseSchema.parse(pending));
    }
  );

  server.get(
    "/api/projects/:projectId/chat/threads/:threadId/streams/:streamId",
    async (request, reply) => {
      const { projectId, threadId, streamId } = parseParams(request, chatStreamParamsSchema);

      reply.hijack();
      prepareStream(reply);

      let terminalSent = false;
      const streamController = new AbortController();
      reply.raw.once("close", () => {
        streamController.abort();
      });

      const sendTerminalError = () => {
        if (terminalSent) {
          endStream(reply);
          return;
        }
        sendStreamEvent(
          reply,
          "chat_error",
          chatErrorEventSchema.parse({
            type: "chat_error",
            projectId,
            threadId,
            message: null,
            occurredAt: new Date().toISOString()
          })
        );
        terminalSent = true;
        endStream(reply);
      };

      try {
        const found = await streamGroundedChatMessage(
          projectId,
          threadId,
          streamId,
          {
            token: (delta) => {
              sendStreamEvent(
                reply,
                "chat_token",
                chatTokenEventSchema.parse({
                  type: "chat_token",
                  projectId,
                  threadId,
                  messageId: streamId,
                  delta,
                  occurredAt: new Date().toISOString()
                })
              );
            },
            completed: (message) => {
              sendStreamEvent(
                reply,
                "chat_completed",
                chatCompletedEventSchema.parse({
                  type: "chat_completed",
                  projectId,
                  threadId,
                  message,
                  occurredAt: new Date().toISOString()
                })
              );
              terminalSent = true;
              endStream(reply);
            },
            error: (message) => {
              sendStreamEvent(
                reply,
                "chat_error",
                chatErrorEventSchema.parse({
                  type: "chat_error",
                  projectId,
                  threadId,
                  message,
                  occurredAt: new Date().toISOString()
                })
              );
              terminalSent = true;
              endStream(reply);
            }
          },
          undefined,
          { abortSignal: streamController.signal }
        );

        if (!found) {
          sendTerminalError();
        }
      } catch {
        sendTerminalError();
      }
    }
  );
}

function prepareStream(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no"
  });
}

function sendStreamEvent(reply: FastifyReply, eventName: string, event: unknown): void {
  if (reply.raw.destroyed || reply.raw.writableEnded) return;

  reply.raw.write(`event: ${eventName}\n`);
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

function endStream(reply: FastifyReply): void {
  if (reply.raw.destroyed || reply.raw.writableEnded) return;
  reply.raw.end();
}
