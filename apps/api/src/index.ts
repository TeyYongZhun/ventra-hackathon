import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createApiApp } from './app.js';
import { createDb } from './db/client.js';
import * as schema from './db/schema.js';
import { seedDemoPatient } from './db/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = createDb();
const app = createApiApp({ db });

// Run Drizzle migrations on every start
migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });

// Seed demo patient automatically if the patients table is empty
const firstPatient = db.select({ id: schema.patients.id }).from(schema.patients).get();
if (!firstPatient) {
  await seedDemoPatient(db);
  app.log.info('Seeded demo patient (Mdm Tan)');
}

// Serve built web app in production
if (process.env.NODE_ENV === 'production') {
  const webDist = path.join(__dirname, '../../web/dist');
  app.register(fastifyStatic, {
    root: webDist,
    prefix: '/',
    wildcard: false,
  });
  app.get('*', async (request, reply) => {
    return reply.sendFile('index.html', webDist);
  });
}

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
