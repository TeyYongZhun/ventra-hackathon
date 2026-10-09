import type { FastifyReply } from 'fastify';

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

export function sendError(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.status(status).send(errorBody(code, message));
}
