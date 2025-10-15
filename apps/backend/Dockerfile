# ========================================
# Multi-stage production Dockerfile for NestJS backend
# Optimized for pnpm workspace and Koyeb deployment
# ========================================

# ========================================
# Stage 1: Build
# ========================================
FROM node:20-alpine AS build

WORKDIR /workspace

# Install system dependencies and pnpm
RUN apk add --no-cache libc6-compat openssl && corepack enable

# Copy workspace root configuration files
COPY ../../pnpm-lock.yaml ../../package.json ../../pnpm-workspace.yaml ./
COPY ../../.npmrc ./ 2>/dev/null || true

# Copy all workspace package.json files for dependency resolution
COPY package.json apps/backend/package.json
COPY ../../shared/ws-types/package.json shared/ws-types/package.json 2>/dev/null || true

# Install all dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Copy backend source code
COPY . apps/backend/
COPY ../../shared/ws-types shared/ws-types/ 2>/dev/null || true

# Generate Prisma client
WORKDIR /workspace/apps/backend
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# ========================================
# Stage 2: Production Runtime
# ========================================
FROM node:20-alpine AS runtime

WORKDIR /app

# Install runtime dependencies and dumb-init for signal handling
RUN apk add --no-cache libc6-compat openssl dumb-init

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application and dependencies
COPY --from=build --chown=nestjs:nodejs /workspace/apps/backend/dist ./dist
COPY --from=build --chown=nestjs:nodejs /workspace/apps/backend/package.json ./package.json
COPY --from=build --chown=nestjs:nodejs /workspace/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /workspace/apps/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nestjs:nodejs /workspace/apps/backend/prisma ./prisma

# Switch to non-root user
USER nestjs

# Expose application port (will be overridden by Koyeb PORT env var)
EXPOSE 3000

# Health check using the /metrics/healthz endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/metrics/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application (main.js is in dist root based on nest-cli.json)
CMD ["node", "dist/main.js"]