import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNotNull, isNull, sum } from 'drizzle-orm';
import { z } from 'zod';
import {
  findFood,
  mealForTime,
  type MealDeleteResponse,
  type MealEstimate,
  type MealListEntry,
  type MealListResponse,
} from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { runAlertRules } from '../services/alerts.js';
import { sgClock, sgDate, sgMinutes } from '../time.js';

const mealSchema = z.union([
  z.object({ foodId: z.string().trim().min(1).max(64) }),
  z.object({ scanId: z.number().int().positive(), addFluid: z.boolean().optional() }),
]);

const idParams = z.object({ id: z.coerce.number().int().positive() });

const photoUrl = (mealId: number) => `/api/meals/${mealId}/photo`;

// One logged meal as the app shows it, with the nutrition estimates for its card.
function toListEntry(meal: typeof schema.meals.$inferSelect, hasPhoto: boolean, fluidAddedMl: number | null): MealListEntry {
  return {
    id: meal.id,
    time: meal.time,
    meal: meal.meal,
    what: meal.what,
    sodiumMg: meal.sodiumMg,
    tip: meal.tip,
    kcal: meal.kcal,
    potassiumMg: meal.potassiumMg,
    phosphorusMg: meal.phosphorusMg,
    carbs: JSON.parse(meal.carbsJson),
    protein: JSON.parse(meal.proteinJson),
    fat: JSON.parse(meal.fatJson),
    plate: JSON.parse(meal.plateJson),
    photoUrl: hasPhoto ? photoUrl(meal.id) : null,
    fluidAddedMl,
  };
}

export interface MealRouteOptions {
  db: ApiDb;
  now: () => number;
  // Called when soup or a drink logged with a meal turns today yellow (e.g. to tell the family).
  onAlert?: (patientId: number, alertId: number) => void;
}

// Food log (C3): a food from the list, or a photo checked by POST /api/vision/meal.
// Salt eaten today feeds GET /api/metrics → sodiumToday. Soup or a drink found in a scanned meal
// is logged as a drink too (fluid_entries.meal_id), so it counts toward today's drink limit.
export function registerMealRoutes(app: FastifyInstance, options: MealRouteOptions) {
  const { db, now, onAlert } = options;

  function afterDrinkChange(patientId: number, nowMs: number) {
    const { alertId } = runAlertRules(db, patientId, nowMs);
    if (alertId != null) onAlert?.(patientId, alertId);
  }

  function todayMeals(patientId: number, date: string) {
    return db.select()
      .from(schema.meals)
      .where(and(eq(schema.meals.patientId, patientId), eq(schema.meals.date, date), eq(schema.meals.isDemoScan, false)))
      .orderBy(desc(schema.meals.id))
      .all();
  }

  // Ids of the patient's meals that have a photo (ids only, the photos stay in the table).
  function mealIdsWithPhoto(patientId: number): Set<number> {
    const rows = db.select({ mealId: schema.mealPhotos.mealId })
      .from(schema.mealPhotos)
      .where(eq(schema.mealPhotos.patientId, patientId))
      .all();
    return new Set(rows.map((row) => row.mealId));
  }

  // Drinks logged with each meal (not undone), by meal id.
  function drinksByMeal(patientId: number): Map<number, number> {
    const rows = db.select({ mealId: schema.fluidEntries.mealId, ml: sum(schema.fluidEntries.ml) })
      .from(schema.fluidEntries)
      .where(and(eq(schema.fluidEntries.patientId, patientId), isNotNull(schema.fluidEntries.mealId), isNull(schema.fluidEntries.deletedAt)))
      .groupBy(schema.fluidEntries.mealId)
      .all();
    return new Map(rows.map((row) => [row.mealId as number, Number(row.ml)]));
  }

  // Today's meals, newest first.
  app.get('/api/meals', async (request) => {
    const scope = patientScope(request);
    const withPhoto = mealIdsWithPhoto(scope.patientId);
    const drinks = drinksByMeal(scope.patientId);
    const entries = todayMeals(scope.patientId, sgDate(now()))
      .map((meal) => toListEntry(meal, withPhoto.has(meal.id), drinks.get(meal.id) ?? null));
    return { entries } satisfies MealListResponse;
  });

  app.post('/api/meals', async (request, reply) => {
    const parsed = mealSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const scope = patientScope(request);
    const nowMs = now();
    const row = (estimate: MealEstimate) => scope.values({
      date: sgDate(nowMs),
      time: sgClock(nowMs),
      meal: mealForTime(sgMinutes(nowMs)),
      what: estimate.what,
      sodiumMg: estimate.sodiumMg,
      kcal: estimate.kcal,
      potassiumMg: estimate.potassiumMg,
      phosphorusMg: estimate.phosphorusMg,
      carbsJson: JSON.stringify(estimate.carbs),
      proteinJson: JSON.stringify(estimate.protein),
      fatJson: JSON.stringify(estimate.fat),
      plateJson: JSON.stringify(estimate.plate),
      tip: estimate.tip,
      isDemoScan: false,
    });

    if ('foodId' in parsed.data) {
      const food = findFood(parsed.data.foodId);
      if (!food) {
        return sendError(reply, 404, 'NOT_FOUND', 'Unknown food');
      }
      const meal = db.insert(schema.meals).values(row(food)).returning().get();
      return toListEntry(meal, false, null);
    }

    // A scanned photo: log the estimate the server stored, and keep the photo with the meal.
    const { scanId, addFluid = true } = parsed.data;
    const scan = db.select()
      .from(schema.mealScans)
      .where(and(eq(schema.mealScans.id, scanId), eq(schema.mealScans.patientId, scope.patientId)))
      .get();
    if (!scan) {
      return sendError(reply, 404, 'NOT_FOUND', 'That photo check has expired. Please scan your meal again.');
    }
    const estimate = JSON.parse(scan.estimateJson) as MealEstimate;
    const drinkMl = addFluid && estimate.fluidMl ? estimate.fluidMl : 0;
    const meal = db.transaction((tx) => {
      const inserted = tx.insert(schema.meals).values(row(estimate)).returning().get();
      tx.insert(schema.mealPhotos).values(scope.values({ mealId: inserted.id, photo: scan.photo })).run();
      tx.delete(schema.mealScans).where(eq(schema.mealScans.id, scan.id)).run();
      if (drinkMl > 0) {
        const what = estimate.fluidWhat || 'soup';
        tx.insert(schema.fluidEntries).values(scope.values({
          date: sgDate(nowMs),
          time: sgClock(nowMs),
          what: `${what.charAt(0).toUpperCase()}${what.slice(1)} with ${estimate.what.toLowerCase()}`.slice(0, 80),
          ml: drinkMl,
          mealId: inserted.id,
        })).run();
      }
      return inserted;
    });
    if (drinkMl > 0) afterDrinkChange(scope.patientId, nowMs);
    return toListEntry(meal, true, drinkMl || null);
  });

  // The photo of a meal logged from a scan. Only the patient who logged it can see it.
  app.get('/api/meals/:id/photo', async (request, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid meal id');
    }
    const scope = patientScope(request);
    const found = db.select({ photo: schema.mealPhotos.photo })
      .from(schema.mealPhotos)
      .where(and(eq(schema.mealPhotos.mealId, params.data.id), eq(schema.mealPhotos.patientId, scope.patientId)))
      .get();
    if (!found) {
      return sendError(reply, 404, 'NOT_FOUND', 'No photo for this meal');
    }
    return reply
      .type('image/jpeg')
      .header('Cache-Control', 'private, max-age=86400')
      .header('X-Content-Type-Options', 'nosniff')
      .send(found.photo);
  });

  // Undo the latest meal logged today, with its photo and any soup or drink logged with it.
  app.delete('/api/meals/last', async (request, reply) => {
    const scope = patientScope(request);
    const nowMs = now();
    const [last] = todayMeals(scope.patientId, sgDate(nowMs));
    if (!last) {
      return sendError(reply, 404, 'NOT_FOUND', 'No meal to undo today');
    }
    const drinksUndone = db.transaction((tx) => {
      tx.delete(schema.mealPhotos).where(and(eq(schema.mealPhotos.mealId, last.id), eq(schema.mealPhotos.patientId, scope.patientId))).run();
      const drinks = tx.update(schema.fluidEntries)
        .set({ deletedAt: new Date(nowMs).toISOString() })
        .where(and(eq(schema.fluidEntries.mealId, last.id), eq(schema.fluidEntries.patientId, scope.patientId), isNull(schema.fluidEntries.deletedAt)))
        .run();
      tx.delete(schema.meals).where(and(eq(schema.meals.id, last.id), eq(schema.meals.patientId, scope.patientId))).run();
      return drinks.changes;
    });
    if (drinksUndone > 0) afterDrinkChange(scope.patientId, nowMs);
    return { ok: true, deletedId: last.id } satisfies MealDeleteResponse;
  });
}
