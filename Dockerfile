# ─── HTN Pilot — Production Dockerfile ───────────────────────────────────────
#
# Multi-stage build strategy:
#   Stage 1 (deps)    — Install production dependencies only
#   Stage 2 (builder) — Build the Next.js app + generate Prisma client
#   Stage 3 (runner)  — Minimal runtime image, non-root user
#
# Image size target: <200MB (vs ~1GB naive single-stage)
# Build time target: <3 min with layer cache hits
#
# Usage:
#   docker build -t htn-pilot:latest .
#   docker run -p 3000:3000 --env-file .env htn-pilot:latest
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependency installer ────────────────────────────────────────────
FROM node:20-alpine AS deps

# Required for bcryptjs native bindings and Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy lockfiles first — cache this layer separately from source code
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install ALL deps (including dev) — needed for Prisma generate
RUN npm ci --frozen-lockfile

# Generate Prisma client for the target platform
RUN npx prisma generate

# ── Stage 2: Application builder ──────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy installed node_modules (with generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application source
COPY . .

# Build-time environment variables (non-secret — these bake into the bundle)
ARG APP_VERSION=unknown
ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
# output: 'standalone' in next.config.mjs creates a self-contained server
RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user — never run production containers as root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema + migrations (needed for migrate deploy at startup)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Drop permissions
USER nextjs

# Expose HTTP port
EXPOSE 3000

# Health check — Kubernetes also does this via probes, but useful for docker run
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Labels for container registry metadata
ARG APP_VERSION=unknown
ARG BUILD_DATE=unknown
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="HTN Pilot" \
      org.opencontainers.image.description="Hypertension Clinical Decision Support" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.licenses="UNLICENSED"

# Start the standalone Next.js server
CMD ["node", "server.js"]
