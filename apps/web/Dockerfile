# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Base image
# ============================================
FROM node:20-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# ============================================
# Stage 2: Install dependencies
# ============================================
FROM base AS deps

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files for all workspaces
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 3: Build the application
# ============================================
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build || echo "No build script for shared"

# Build Next.js app
WORKDIR /app/apps/web

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

RUN pnpm build

# ============================================
# Stage 4: Production image
# ============================================
FROM base AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN groupadd -r fluxboard && useradd -r -g fluxboard fluxboard

# Copy standalone build
COPY --from=builder --chown=fluxboard:fluxboard /app/apps/web/.next/standalone ./
COPY --from=builder --chown=fluxboard:fluxboard /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=fluxboard:fluxboard /app/apps/web/public ./apps/web/public

USER fluxboard

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
