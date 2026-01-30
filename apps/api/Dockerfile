# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy package.json files for all workspaces
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/llm/package.json ./packages/llm/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/api ./apps/api

# Build packages in dependency order, then API
RUN pnpm --filter database build && \
    pnpm --filter types build && \
    pnpm --filter llm build && \
    pnpm --filter api build

# Production stage
FROM node:20-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/llm/package.json ./packages/llm/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/llm/dist ./packages/llm/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy database migrations
COPY --from=builder /app/packages/database/migrations ./packages/database/migrations

# Copy and set permissions for entrypoint script
COPY apps/api/docker-entrypoint.sh /app/apps/api/
RUN chmod +x /app/apps/api/docker-entrypoint.sh

# Set working directory to API
WORKDIR /app/apps/api

# Expose port
EXPOSE 3000

# Use entrypoint script to run migrations and start server
ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
