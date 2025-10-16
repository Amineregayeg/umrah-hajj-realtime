# ========================================
# Multi-stage production Dockerfile for NestJS backend
# Simplified for Koyeb deployment with apps/backend context
# ========================================

# ========================================
# Stage 1: Build
# ========================================
FROM node:20-alpine AS build

WORKDIR /app

# Install system dependencies and pnpm
RUN apk add --no-cache libc6-compat openssl && corepack enable

# Debug: List what files are in the build context
RUN echo "=== Debugging build context ===" && ls -la / 2>/dev/null || true

# Copy everything first to see what we have
COPY . .

# Debug: Show what was copied
RUN echo "=== Files in /app after COPY ===" && ls -la /app

# Install dependencies
RUN pnpm install --frozen-lockfile

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

# Copy built application and dependencies
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma

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
