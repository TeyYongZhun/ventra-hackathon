import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable('patients', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  phone: text('phone').notNull().unique(),
  pinHash: text('pin_hash').notNull(),
  name: text('name').notNull(),
});
