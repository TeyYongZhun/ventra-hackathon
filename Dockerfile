FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm -r build

FROM base AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/packages/core/dist ./packages/core/dist
# The API imports @ventra/core through this package.json (exports → dist).
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/index.js"]
