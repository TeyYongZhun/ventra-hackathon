import type { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  findFood,
  mealForTime,
  type MealDeleteResponse,
  type MealListResponse,
} from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { sgClock, sgDate, sgMinutes } from '../time.js';

const mealSchema = z.object({
  foodId: z.string().trim().min(1).max(64),
});

export interface MealRouteOptions {
  db: ApiDb;
  now: () => number;
}

// Manual food log (C3). Salt eaten today feeds GET /api/metrics → sodiumToday.
export function registerMealRoutes(app: FastifyInstance, options: MealRouteOptions) {
  const { db, now } = options;

  function todayMeals(patientId: number, date: string) {
    return db.select()
      .from(schema.meals)
      .where(and(eq(schema.meals.patientId, patientId), eq(schema.meals.date, date), eq(schema.meals.isDemoScan, false)))
      .orderBy(desc(schema.meals.id))
      .all();
  }

  // Today's meals, newest first.
  app.get('/api/meals', async (request) => {
    const scope = patientScope(request);
    const entries = todayMeals(scope.patientId, sgDate(now())).map((meal) => ({
      id: meal.id,
      time: meal.time,
      meal: meal.meal,
      what: meal.what,
      sodiumMg: meal.sodiumMg,
      tip: meal.tip,
    }));
    return { entries } satisfies MealListResponse;
  });

  app.post('/api/meals', async (request, reply) => {
    const parsed = mealSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }
    const food = findFood(parsed.data.foodId);
    if (!food) {
      return sendError(reply, 404, 'NOT_FOUND', 'Unknown food');
    }

    const scope = patientScope(request);
    const nowMs = now();
    const meal = db.insert(schema.meals).values(scope.values({
      date: sgDate(nowMs),
      time: sgClock(nowMs),
      meal: mealForTime(sgMinutes(nowMs)),
      what: food.what,
      sodiumMg: food.sodiumMg,
      kcal: food.kcal,
      potassiumMg: food.potassiumMg,
      phosphorusMg: food.phosphorusMg,
      carbsJson: JSON.stringify(food.carbs),
      proteinJson: JSON.stringify(food.protein),
      fatJson: JSON.stringify(food.fat),
      plateJson: JSON.stringify(food.plate),
      tip: food.tip,
      isDemoScan: false,
    })).returning().get();

    return { id: meal.id, time: meal.time, meal: meal.meal, what: meal.what, sodiumMg: meal.sodiumMg, tip: meal.tip };
  });

  // Undo the latest meal logged today.
  app.delete('/api/meals/last', async (request, reply) => {
    const scope = patientScope(request);
    const [last] = todayMeals(scope.patientId, sgDate(now()));
    if (!last) {
      return sendError(reply, 404, 'NOT_FOUND', 'No meal to undo today');
    }
    db.delete(schema.meals).where(and(eq(schema.meals.id, last.id), eq(schema.meals.patientId, scope.patientId))).run();
    return { ok: true, deletedId: last.id } satisfies MealDeleteResponse;
  });
}
