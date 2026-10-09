# Deploy on your own server

If you have your own server with a persistent disk and a public domain, use the files in this repo:

- `docker-compose.yml` — runs the API + Caddy reverse proxy with automatic HTTPS.
- `Caddyfile` — simple reverse proxy from `:80` to the API container.
- `Dockerfile` — standard production build (port 3000).

These are kept for people who want full control, custom domains, and persistent volumes.

For free/temporary-disk hosts, see `docs/deploy-free.md`.
