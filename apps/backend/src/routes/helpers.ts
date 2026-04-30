import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError, type ZodTypeAny, type z } from "zod";

export function parseBody<T extends ZodTypeAny>(request: FastifyRequest, schema: T): z.output<T> {
  return schema.parse(request.body);
}

export function parseParams<T extends ZodTypeAny>(request: FastifyRequest, schema: T): z.output<T> {
  return schema.parse(request.params);
}

export function sendValidationError(error: ZodError, reply: FastifyReply) {
  return reply.status(400).send({
    error: "validation_failed",
    message: "Request validation failed",
    issues: error.issues
  });
}
