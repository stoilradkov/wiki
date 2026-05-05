import type { FastifyInstance, FastifyReply } from "fastify";
import { QueueEvents } from "bullmq";
import {
  documentIngestionEventSchema,
  ingestionHeartbeatEventSchema,
  ingestionQueueName,
  ingestionSnapshotEventSchema,
  type DocumentIngestionEvent,
  type IngestionHeartbeatEvent,
  type IngestionStreamEvent
} from "@wiki/shared";
import { env } from "@wiki/backend/env";
import { listDocuments } from "@wiki/backend/modules/documents/repository";
import { getProject } from "@wiki/backend/modules/projects/repository";
import { projectParamsSchema } from "@wiki/backend/modules/projects/routes";
import { createRedisConnection } from "@wiki/backend/redis/connection";
import { parseParams } from "@wiki/backend/routes/helpers";

const queueEvents = new QueueEvents(ingestionQueueName, {
  connection: createRedisConnection(env.REDIS_URL)
});

export async function registerIngestionEventRoutes(server: FastifyInstance) {
  server.get("/api/projects/:projectId/ingestion/events", async (request, reply) => {
    const { projectId } = parseParams(request, projectParamsSchema);

    if (!(await getProject(projectId))) {
      return reply.status(404).send({ error: "not_found", message: "Project not found" });
    }

    reply.hijack();
    prepareStream(reply);

    sendStreamEvent(
      reply,
      ingestionSnapshotEventSchema.parse({
        type: "ingestion_snapshot",
        projectId,
        documents: await listDocuments(projectId),
        occurredAt: new Date().toISOString()
      })
    );

    const handleProgress = (event: { data: unknown }) => {
      const parsed = parseProgressEvent(event.data);

      if (parsed?.projectId === projectId) {
        sendStreamEvent(reply, parsed);
      }
    };

    queueEvents.on("progress", handleProgress);

    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      queueEvents.off("progress", handleProgress);
    };

    const heartbeat = setInterval(() => {
      sendStreamEvent(
        reply,
        ingestionHeartbeatEventSchema.parse({
          type: "heartbeat",
          occurredAt: new Date().toISOString()
        })
      );
    }, 25_000);

    request.raw.on("aborted", cleanup);
    request.raw.on("close", cleanup);
    reply.raw.on("error", cleanup);
  });
}

export async function closeIngestionEventRoutes(): Promise<void> {
  await queueEvents.close();
}

function prepareStream(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no"
  });
}

function sendStreamEvent(
  reply: FastifyReply,
  event: IngestionStreamEvent | IngestionHeartbeatEvent
): void {
  if (reply.raw.destroyed || reply.raw.writableEnded) return;

  reply.raw.write(`event: ${event.type}\n`);
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

function parseProgressEvent(data: unknown): DocumentIngestionEvent | null {
  const payload = typeof data === "string" ? parseJson(data) : data;
  const parsed = documentIngestionEventSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

function parseJson(value: string): unknown {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    return null;
  }
}
