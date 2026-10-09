import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    patientId?: number;
    sessionToken?: string;
  }
}
