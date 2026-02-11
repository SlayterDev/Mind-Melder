# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy package.json files for needed workspaces
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (only what's needed for web build)
COPY packages/database ./packages/database
COPY packages/types ./packages/types
COPY apps/web ./apps/web

# Build packages in dependency order, then web
RUN pnpm --filter database build && \
    pnpm --filter types build && \
    pnpm --filter "./apps/web" build

# Production stage with nginx
FROM nginx:alpine

LABEL org.opencontainers.image.source="https://github.com/SlayterDev/Mind-Melder"
LABEL org.opencontainers.image.description="Mind-Melder web frontend"
LABEL org.opencontainers.image.licenses="TBD"

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy built static files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
