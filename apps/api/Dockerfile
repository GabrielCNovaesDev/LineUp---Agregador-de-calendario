FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/adapters/package.json packages/adapters/
COPY packages/shared/package.json packages/shared/

RUN npm ci --ignore-scripts

COPY packages/ packages/
COPY apps/api/ apps/api/

RUN npm run build --workspace=packages/shared && \
    npm run build --workspace=packages/adapters && \
    npm run build --workspace=apps/api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/adapters/package.json packages/adapters/
COPY packages/shared/package.json packages/shared/

RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/adapters/dist packages/adapters/dist
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY infra/migrations infra/migrations
COPY infra/migrate.js infra/migrate.js

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
