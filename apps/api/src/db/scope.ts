import { eq, type SQL } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export function requirePatientId(request: FastifyRequest): number {
  if (typeof request.patientId !== 'number') {
    throw new Error('Authenticated patient_id is required');
  }

  return request.patientId;
}

export function patientScope(request: FastifyRequest) {
  const patientId = requirePatientId(request);

  return {
    patientId,
    where: (patientIdColumn: AnySQLiteColumn): SQL => eq(patientIdColumn, patientId),
    values: <T extends Record<string, unknown>>(values: T): T & { patientId: number } => ({
      ...values,
      patientId,
    }),
  };
}
