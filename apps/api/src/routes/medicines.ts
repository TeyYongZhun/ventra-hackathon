import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  catalogMedicine,
  MEDICINE_LEAFLETS,
  medicineIdForBarcode,
  type MedicineScanResponse,
} from '@ventra/core';
import type { ApiDb } from '../app.js';
import { toMedicine } from '../db/loader.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';

// EAN-8, UPC-A, EAN-13 or GTIN-14: digits only.
const barcodeParams = z.object({ code: z.string().regex(/^\d{8,14}$/) });

const GENERAL_LEAFLET = {
  mayFeel: 'Your pharmacist can tell you what to look out for.',
  callNurse: 'If you feel unwell after taking it.',
};

export interface MedicineRouteOptions {
  db: ApiDb;
}

// "Scan a medicine box" (D1): what the medicine is and whether it is on the patient's own list.
// Explanation only; the list itself is only changed in set-up (My details → Medicines).
export function registerMedicineRoutes(app: FastifyInstance, options: MedicineRouteOptions) {
  const { db } = options;

  app.get('/api/medicines/barcode/:code', async (request, reply) => {
    const params = barcodeParams.safeParse(request.params);
    if (!params.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'A barcode is 8 to 14 digits');
    }
    const medId = medicineIdForBarcode(params.data.code);
    const known = medId ? catalogMedicine(medId) : undefined;
    if (!medId || !known) return { status: 'unknown' } satisfies MedicineScanResponse;

    const scope = patientScope(request);
    const own = db.select()
      .from(schema.medications)
      .where(and(eq(schema.medications.patientId, scope.patientId), eq(schema.medications.medId, medId)))
      .get();
    const leaflet = MEDICINE_LEAFLETS[medId] ?? GENERAL_LEAFLET;

    return (own
      ? { status: 'yours', medicine: toMedicine(own), leaflet }
      : { status: 'not_yours', medicine: known, leaflet }) satisfies MedicineScanResponse;
  });
}
