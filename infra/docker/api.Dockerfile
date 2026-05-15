# ─── API Dockerfile ───────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/ai-client/package.json ./packages/ai-client/
RUN pnpm install --frozen-lockfile

# Build shared packages
FROM deps AS builder
COPY packages ./packages
COPY apps/api ./apps/api
COPY turbo.json ./
RUN pnpm --filter @aidevops/shared-types build
RUN pnpm --filter @aidevops/ai-client build
RUN pnpm --filter @aidevops/api build

# Production image
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/main"]
