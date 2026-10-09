import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import { createApiApp } from './app.js';
import { createDb } from './db/client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = createDb();
const app = createApiApp({ db });

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
