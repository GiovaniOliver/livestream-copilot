# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Base image with dependencies
# ============================================
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
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
COPY apps/desktop-companion/package.json ./apps/desktop-companion/

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
COPY --from=deps /app/apps/desktop-companion/node_modules ./apps/desktop-companion/node_modules

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/desktop-companion ./apps/desktop-companion
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Generate Prisma client
WORKDIR /app/apps/desktop-companion
RUN pnpm db:generate

# Build TypeScript
RUN pnpm build

# ============================================
# Stage 4: Production image
# ============================================
FROM base AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3123
ENV WS_PORT=3124

# Create non-root user for security
RUN groupadd -r fluxboard && useradd -r -g fluxboard fluxboard

# Copy only production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/desktop-companion/node_modules ./apps/desktop-companion/node_modules

# Copy built application
COPY --from=builder /app/apps/desktop-companion/dist ./apps/desktop-companion/dist
COPY --from=builder /app/apps/desktop-companion/prisma ./apps/desktop-companion/prisma
COPY --from=builder /app/apps/desktop-companion/src/generated ./apps/desktop-companion/src/generated
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy package files
COPY packages/shared/package.json ./packages/shared/
COPY apps/desktop-companion/package.json ./apps/desktop-companion/

# Create directories for runtime data
RUN mkdir -p /app/session /app/logs && \
    chown -R fluxboard:fluxboard /app

USER fluxboard

WORKDIR /app/apps/desktop-companion

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE 3123 3124

CMD ["node", "dist/index.js"]
