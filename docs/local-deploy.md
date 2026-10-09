# Local development

This guide covers running Ventra on your local machine for development and testing.

---

## Prerequisites

| Tool | Version | How to check |
|------|---------|--------------|
| Node.js | 22.x | `node -v` |
| pnpm | 9.12.0+ | `pnpm -v` |

Install pnpm if you don't have it:
```bash
npm install -g pnpm@9.12.0
```

---

## 1. Clone and install

```bash
git clone <repo-url>
cd ventra-hackathon
pnpm install
```

This installs dependencies for all workspace packages (`apps/web`, `apps/api`, `packages/core`).

---

## 2. Start both servers

From the project root, run:

```bash
pnpm dev
```

This starts both services in parallel:

| Service | URL | Description |
|---------|-----|-------------|
| Web dev server | http://localhost:5173 | React + Vite frontend |
| API server | http://localhost:3000 | Fastify + SQLite backend |

The web dev server proxies `/api/*` requests to `localhost:3000` automatically (configured in `apps/web/vite.config.ts`).

---

## 3. Open the app

Go to **http://localhost:5173**

Click **"Log in as demo patient"** to sign in as `Mdm Tan`:
- Phone: `81234567`
- PIN: `1234`

The demo patient and all seed data are created automatically on first API startup.

---

## 4. Project structure

```
ventra-hackathon/
├── apps/
│   ├── web/           # React + Vite + PWA frontend
│   │   ├── src/
│   │   │   ├── pages/     # Login, Home, Track, etc.
│   │   │   ├── components/# BottomNav, SOSButton, Layout, etc.
│   │   │   └── lib/api.ts # React Query hooks + fetch wrapper
│   │   └── vite.config.ts
│   └── api/           # Fastify + SQLite backend
│       ├── src/
│       │   ├── app.ts     # Route handlers
│       │   ├── index.ts   # Server entry + seed
│       │   └── db/        # Schema, migrations, seed
│       └── drizzle/       # Database migrations
├── packages/
│   └── core/          # Shared TypeScript logic
├── docs/              # Documentation
├── design/            # HTML design references
└── docker-compose.yml # Production Docker setup
```

---

## 5. Available scripts

Run from the project root:

```bash
pnpm dev        # Start web + API in dev mode
pnpm build      # Build all packages for production
pnpm test       # Run all tests
pnpm lint       # Type-check all packages
```

Or run per app:

```bash
cd apps/web && pnpm dev       # Frontend only (port 5173)
cd apps/api && pnpm dev       # Backend only (port 3000)
cd apps/api && pnpm test      # API tests
cd apps/web && pnpm test      # Frontend tests
```

---

## 6. Database

The API uses **SQLite** stored locally at:
```
apps/api/data/ventra.db
```

The database is:
- Created automatically on first run
- Migrated automatically on every startup
- Seeded with demo patient data if empty

To reset the database, just delete `apps/api/data/ventra.db` and restart the API.

---

## 7. Environment variables (optional)

Create `apps/api/.env` if you need to override defaults:

```env
PORT=3000
HOST=0.0.0.0
DATABASE_PATH=./data/ventra.db
LOG_LEVEL=info
```

For the web app, Vite env vars go in `apps/web/.env`:

```env
VITE_MOCK_API=false   # Set to true to use mock API instead of real backend
```

---

## 8. Common issues

### Port already in use
```bash
# Find what's using port 3000
lsof -i :3000   # macOS/Linux
netstat -ano | findstr :3000   # Windows

# Or change the port in apps/api/.env
PORT=3001
```

### Web can't reach API
Make sure both servers are running. The Vite dev server proxies `/api` to `localhost:3000`. If you changed the API port, update `apps/web/vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',  // match your API port
      changeOrigin: true,
    },
  },
},
```

### "Demo patient not found" on login
The demo patient seeds automatically if the database is empty. If login fails:
1. Stop the API server
2. Delete `apps/api/data/ventra.db`
3. Restart the API — it will re-seed on startup

---

## 9. Mock API mode (frontend-only development)

If you only want to work on the frontend without running the API:

```bash
cd apps/web
VITE_MOCK_API=true pnpm dev
```

This uses `mockResponse()` in `apps/web/src/lib/api.ts` instead of hitting the real backend. All data is fake and in-memory.

---

## 10. Tech stack summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, React Query, React Router |
| Backend | Fastify 4, TypeScript, Drizzle ORM, SQLite |
| Shared | Pure TypeScript (`packages/core`) |
| Testing | Vitest |
| Styling | CSS custom properties (design tokens) |
| PWA | vite-plugin-pwa |
