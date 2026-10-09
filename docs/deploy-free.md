# Deploy on free / ephemeral-disk hosts

This guide covers deploying Ventra on platforms that are free but use **ephemeral disks** (data is wiped on every deploy, restart, or sleep). The app works fine on these hosts — the SQLite database is recreated and re-seeded automatically on startup.

> For persistent-disk / own-server deployment, see [`deploy.md`](./deploy.md).

---

## Quick summary

| Platform | Best for | Disk | Sleep |
|----------|----------|------|-------|
| **Hugging Face Spaces** | Demo / hackathon showcase | Ephemeral | Yes |
| **Railway** | Hobby / small traffic | Ephemeral | No |
| **Render** | Hobby / small traffic | Ephemeral | Yes (15 min) |
| **Fly.io** | Hobby / small traffic | Ephemeral (free tier) | No |

---

## How it works on ephemeral hosts

The API seeds the demo patient (`Mdm Tan`) automatically if the `patients` table is empty:

```
Startup → migrate DB → no patients? → seed demo data → listen on PORT
```

This means:
- Every redeploy restarts with fresh demo data.
- Real user sign-ups work, but accounts are lost on the next restart.
- For hackathons and demos, this is usually fine.

---

## Hugging Face Spaces

A `Dockerfile.hf` is already included. It runs the API on port `7860` (required by Spaces).

### 1. Create a Space
- Go to [huggingface.co/spaces](https://huggingface.co/spaces)
- Click **Create new Space**
- Choose **Docker** → **Blank**

### 2. Push this repo

```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/ventra
cd ventra
# copy your project files here
git add .
git commit -m "Initial deploy"
git push
```

Or use the Hugging Face UI to upload files.

### 3. Required files
Make sure these are in the root of the Space:

- `Dockerfile.hf`
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `apps/`, `packages/`, `design/` (full repo)

### 4. Build settings
Set the Space to use the custom Dockerfile:
- Go to **Settings** → **Space Hardware**
- Select **CPU (free)**
- The `Dockerfile.hf` will be auto-detected, or set **Dockerfile location** to `Dockerfile.hf`

### 5. Access the app
Once built, open the Space URL. The API serves the built React app at `/`.

> **Note:** Hugging Face Spaces sleeps after inactivity. The first visit after sleep will take ~30–60 seconds to cold-start.

---

## Railway

### 1. Create project
- [railway.app](https://railway.app) → New Project → Deploy from GitHub repo

### 2. Dockerfile
Railway auto-detects `Dockerfile` in the repo root. You can use the standard `Dockerfile` (port `3000`).

### 3. Add a volume (optional but recommended)
If you want data to persist between deploys:
- Go to **Volumes** → **New Volume**
- Mount path: `/app/apps/api/data`
- Set environment variable: `DATABASE_PATH=/app/apps/api/data/ventra.db`

Without a volume, the database resets on every deploy.

### 4. Environment variables
Add in Railway dashboard:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_PATH` | `/app/apps/api/data/ventra.db` (if using volume) |

---

## Render

### 1. Create Web Service
- [render.com](https://render.com) → New → Web Service
- Connect your GitHub repo

### 2. Settings
| Setting | Value |
|---------|-------|
| Runtime | Docker |
| Dockerfile path | `./Dockerfile` |
| Port | `3000` |

### 3. Environment variables
Add in Render dashboard:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

### 4. Limitations
Render free web services spin down after 15 minutes of inactivity. The next request takes ~30 seconds to wake up, and the database will be re-seeded.

---

## Fly.io

### 1. Install Fly CLI and login
```bash
brew install flyctl
fly auth login
```

### 2. Launch
```bash
fly launch --dockerfile Dockerfile
```

### 3. Add a volume for persistence (optional)
```bash
fly volumes create ventra_data --size 1 --region sin
```

Then mount it in `fly.toml`:
```toml
[mounts]
  source = "ventra_data"
  destination = "/app/apps/api/data"
```

Set environment variable:
```bash
fly secrets set DATABASE_PATH=/app/apps/api/data/ventra.db
```

### 4. Deploy
```bash
fly deploy
```

---

## Environment variables reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | — | Set to `production` for prod builds |
| `PORT` | `3000` | API server port |
| `HOST` | `0.0.0.0` | Bind address |
| `DATABASE_PATH` | `./data/ventra.db` | SQLite file path |
| `LOG_LEVEL` | `info` | Fastify log level |

---

## Important notes for ephemeral hosts

1. **Data loss is expected** — every restart wipes the SQLite database and re-seeds the demo patient. This is by design for free tiers.
2. **No file uploads** — uploaded meal photos or voice recordings should use external storage (S3, Cloudinary, etc.) if you need persistence.
3. **First boot is slow** — Docker build + pnpm install + TypeScript compilation + DB migration + seeding can take 2–5 minutes.
4. **Cold starts** — free tiers sleep after inactivity. The first request after sleep triggers the full startup sequence.

---

## Production checklist (if upgrading to paid/persistent)

- [ ] Switch from SQLite to PostgreSQL or MySQL
- [ ] Use persistent volume or managed database
- [ ] Set up `docker-compose.yml` with Caddy for HTTPS
- [ ] Configure external file storage for photos/audio
- [ ] Set `Secure` flag on session cookies (already handled when `NODE_ENV=production`)
