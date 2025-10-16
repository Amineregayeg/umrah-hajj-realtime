# ========================================
# Multi-stage production Dockerfile for NestJS backend
# For Koyeb deployment with pnpm workspace
# ========================================

# ========================================
# Stage 1: Build
# ========================================
FROM node:20-alpine AS build

WORKDIR /workspace

# Install system dependencies and pnpm
RUN apk add --no-cache libc6-compat openssl && corepack enable

# Copy everything from repo root
COPY . .

# Debug: Show what was copied
RUN echo "=== Contents of /workspace ===" && ls -la /workspace && \
    echo "=== Checking for key files ===" && \
    ls -la /workspace/package.json 2>/dev/null || echo "No package.json in /workspace" && \
    ls -la /workspace/pnpm-lock.yaml 2>/dev/null || echo "No pnpm-lock.yaml in /workspace" && \
    ls -la /workspace/apps/ 2>/dev/null || echo "No apps/ directory"

# Install all workspace dependencies from root
# This reads pnpm-lock.yaml and pnpm-workspace.yaml from root
RUN pnpm install --frozen-lockfile

# Change to backend directory for building
WORKDIR /workspace/apps/backend

# Generate Prisma client
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

# Copy built application and dependencies from backend directory
COPY --from=build --chown=nestjs:nodejs /workspace/apps/backend/dist ./dist
COPY --from=build --chown=nestjs:nodejs /workspace/apps/backend/package.json ./package.json
COPY --from=build --chown=nestjs:nodejs /workspace/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /workspace/apps/backend/prisma ./prisma

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/metrics/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start the application
CMD ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node dist/main.js"]
