# Environment Configuration Guide
**Umrah & Hajj Real-time Application**

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Files](#environment-files)
3. [Required Variables](#required-variables)
4. [Optional Variables](#optional-variables)
5. [Database Configuration](#database-configuration)
6. [Security Configuration](#security-configuration)
7. [Feature Flags](#feature-flags)
8. [Deployment Environments](#deployment-environments)
9. [Secrets Management](#secrets-management)
10. [Validation & Testing](#validation--testing)

---

## Overview

The Umrah & Hajj Real-time application uses environment variables for configuration across different deployment environments (development, staging, production). All sensitive data (API keys, database credentials, JWT secrets) **MUST** be stored in environment variables, never hardcoded.

---

## Environment Files

### File Structure

```
apps/backend/
├── .env                    # Local development (NOT in git)
├── .env.example            # Template with no secrets (IN git)
├── .env.test               # Test environment (NOT in git)
├── .env.koyeb.staging      # Koyeb staging (NOT in git)
└── .env.koyeb.production   # Koyeb production (NOT in git)
```

### File Permissions

**CRITICAL SECURITY REQUIREMENT:**

```bash
# Set proper permissions (owner read/write only)
chmod 600 .env
chmod 600 .env.test
chmod 600 .env.koyeb.staging
chmod 600 .env.koyeb.production

# Example file should be world-readable
chmod 644 .env.example
```

### Creating Environment Files

```bash
# Development setup
cd apps/backend
cp .env.example .env

# Edit with your values
nano .env  # or your preferred editor
```

---

## Required Variables

### Application Configuration

```bash
# Node environment (development | test | production)
NODE_ENV=development

# Application port
PORT=3000

# Public URL for CORS and webhooks
PUBLIC_URL=http://localhost:3000

# Allowed origins for CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# WebSocket origin (strict validation)
WS_ORIGIN=http://localhost:3000
```

### Database Configuration

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"

# Example for local development:
DATABASE_URL="postgresql://umrah_user:umrah_pass@localhost:5432/umrah_dev?schema=public"

# Example for production (use connection pooling):
DATABASE_URL="postgresql://user:pass@db.example.com:5432/db?schema=public&connection_limit=10&pool_timeout=20"
```

**Connection String Parameters:**
- `schema`: PostgreSQL schema (default: `public`)
- `connection_limit`: Max connections in pool (default: unlimited)
- `pool_timeout`: Connection timeout in seconds (default: 10)
- `connect_timeout`: Initial connection timeout (default: 5)

### Authentication & Security

```bash
# Supabase JWT Secret (RS256 public key)
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here

# Supabase URL (optional, for additional Supabase features)
SUPABASE_URL=https://your-project.supabase.co

# Supabase Anon Key (optional)
SUPABASE_ANON_KEY=your-anon-key-here

# Authentication mode (mock | supabase)
AUTH_MODE=supabase  # Use 'mock' only for development/testing
```

### AI Services

```bash
# OpenAI API Key (for AI assistance features)
OPENAI_API_KEY=sk-your-openai-api-key-here

# AI Provider (OPENAI | ANTHROPIC | GOOGLE | AZURE)
AI_PROVIDER=OPENAI

# AI Model
AI_MODEL=gpt-4-turbo-preview
```

---

## Optional Variables

### WebSocket Configuration

```bash
# WebSocket server port (default: shares HTTP port)
WS_PORT=3001

# MessagePack support for WebSocket (true | false)
WS_MSGPACK_ENABLED=false

# WebSocket heartbeat interval (ms)
WS_HEARTBEAT_INTERVAL=15000
```

### Security Headers

```bash
# Content Security Policy mode (enforce | report-only)
CSP_MODE=enforce

# CDN domains for CSP (comma-separated)
CDN_DOMAINS=https://cdn.example.com,https://static.example.com

# HSTS max age (seconds)
HSTS_MAX_AGE=31536000

# Security headers enabled (true | false)
SECURITY_HEADERS_ENABLED=true
```

### Logging & Monitoring

```bash
# Log level (error | warn | info | debug | verbose)
LOG_LEVEL=info

# PII redaction enabled (true | false)
PII_REDACTION_ENABLED=true

# Audit logging enabled (true | false)
AUDIT_LOGGING_ENABLED=true

# Log format (json | text)
LOG_FORMAT=json
```

### Rate Limiting

```bash
# Global rate limit (requests per 15 minutes)
RATE_LIMIT_MAX=100

# Rate limit window (ms)
RATE_LIMIT_WINDOW_MS=900000

# Voice token rate limit (requests per minute)
VOICE_TOKEN_RATE_LIMIT=5

# Voice token burst limit
VOICE_TOKEN_BURST_LIMIT=10
```

### Graph & Navigation

```bash
# Graph file path
GRAPH_PATH=./data/nav_graph.json

# Graph cache size (number of routes)
GRAPH_CACHE_SIZE=1000

# Graph cache TTL (ms)
GRAPH_CACHE_TTL=300000

# HMM tracking enabled (true | false)
HMM_TRACKING_ENABLED=true

# Navigation correction enabled (true | false)
NAV_CORRECTION_ENABLED=true
```

### Quran Content

```bash
# Quran data directory
QURAN_DATA_PATH=./assets/quran

# Quran cache size (number of entries)
QURAN_CACHE_SIZE=500

# Quran cache TTL (ms)
QURAN_CACHE_TTL=86400000  # 24 hours
```

---

## Database Configuration

### Local Development

```bash
DATABASE_URL="postgresql://umrah_user:umrah_pass@localhost:5432/umrah_dev?schema=public"
```

**Setup Steps:**
```bash
# Create database user
psql -U postgres -c "CREATE USER umrah_user WITH PASSWORD 'umrah_pass';"

# Create database
psql -U postgres -c "CREATE DATABASE umrah_dev OWNER umrah_user;"

# Run migrations
pnpm run prisma:migrate

# Seed data
pnpm run prisma:seed
```

### Docker Development

```bash
DATABASE_URL="postgresql://umrah_user:umrah_pass@postgres:5432/umrah_dev?schema=public"
```

**Docker Compose:**
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: umrah_user
      POSTGRES_PASSWORD: umrah_pass
      POSTGRES_DB: umrah_dev
    ports:
      - "5432:5432"
```

### Production (Managed Database)

```bash
DATABASE_URL="postgresql://user:pass@db.region.provider.com:5432/db?schema=public&sslmode=require&connection_limit=10&pool_timeout=20"
```

**Important Production Settings:**
- Always use `sslmode=require` for encrypted connections
- Set `connection_limit` based on your database plan (typically 10-20)
- Use connection pooling with `pool_timeout`
- Never commit production credentials to git

---

## Security Configuration

### Environment-Specific Security

#### Development

```bash
NODE_ENV=development
AUTH_MODE=mock
CSP_MODE=report-only
SECURITY_HEADERS_ENABLED=true
PII_REDACTION_ENABLED=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Characteristics:**
- Mock authentication for easier testing
- CSP in report-only mode (logs violations, doesn't block)
- Localhost origins allowed
- PII redaction still enabled for testing

#### Staging

```bash
NODE_ENV=production
AUTH_MODE=supabase
CSP_MODE=enforce
SECURITY_HEADERS_ENABLED=true
PII_REDACTION_ENABLED=true
ALLOWED_ORIGINS=https://staging.umrah-app.com
SUPABASE_JWT_SECRET=staging-secret
```

**Characteristics:**
- Production mode with real authentication
- CSP enforced
- Staging-specific origins
- Separate Supabase project for staging

#### Production

```bash
NODE_ENV=production
AUTH_MODE=supabase
CSP_MODE=enforce
SECURITY_HEADERS_ENABLED=true
PII_REDACTION_ENABLED=true
AUDIT_LOGGING_ENABLED=true
ALLOWED_ORIGINS=https://app.umrah-hajj.com,https://www.umrah-hajj.com
SUPABASE_JWT_SECRET=production-secret
RATE_LIMIT_MAX=100
```

**Characteristics:**
- Strictest security settings
- Full audit logging enabled
- Production origins only
- Rate limiting enforced
- Real JWT secrets

---

## Feature Flags

### WebSocket Features

```bash
# Enable MessagePack binary protocol
WS_MSGPACK_ENABLED=true

# Enable WebSocket metrics
WS_METRICS_ENABLED=true

# Enable WebSocket rate limiting
WS_RATE_LIMITING_ENABLED=true
```

### Navigation Features

```bash
# Enable HMM map-matching
HMM_TRACKING_ENABLED=true

# Enable GPS correction
NAV_CORRECTION_ENABLED=true

# Enable floor transition detection
FLOOR_TRANSITION_ENABLED=true

# Enable zone gating
ZONE_GATING_ENABLED=true
```

### AI Features

```bash
# Enable AI chat
AI_CHAT_ENABLED=true

# Enable voice token generation
AI_VOICE_TOKEN_ENABLED=true

# Enable AI recommendations
AI_RECOMMENDATIONS_ENABLED=true

# AI token usage tracking
AI_TOKEN_TRACKING_ENABLED=true
```

### Content Features

```bash
# Enable Quran search
QURAN_SEARCH_ENABLED=true

# Enable prayer times
PRAYER_TIMES_ENABLED=true

# Enable Qibla calculation
QIBLA_CALCULATION_ENABLED=true
```

---

## Deployment Environments

### Koyeb Staging

**Environment:** Koyeb Cloud Platform

```bash
# Application
NODE_ENV=production
PORT=8000
PUBLIC_URL=https://staging-umrah-backend.koyeb.app

# Database (Supabase or managed PostgreSQL)
DATABASE_URL=postgresql://...

# Security
ALLOWED_ORIGINS=https://staging-umrah-app.vercel.app
WS_ORIGIN=https://staging-umrah-app.vercel.app
AUTH_MODE=supabase
SUPABASE_JWT_SECRET=...

# Features
WS_MSGPACK_ENABLED=true
HMM_TRACKING_ENABLED=true
```

**Koyeb Environment Variables:**
Set via Koyeb Dashboard → Service → Settings → Environment Variables

### Koyeb Production

```bash
# Application
NODE_ENV=production
PORT=8000
PUBLIC_URL=https://api.umrah-hajj.com

# Database
DATABASE_URL=postgresql://...?connection_limit=20

# Security
ALLOWED_ORIGINS=https://app.umrah-hajj.com,https://www.umrah-hajj.com
WS_ORIGIN=https://app.umrah-hajj.com
AUTH_MODE=supabase
SUPABASE_JWT_SECRET=...

# Performance
RATE_LIMIT_MAX=100
GRAPH_CACHE_SIZE=2000
QURAN_CACHE_SIZE=1000

# Monitoring
LOG_LEVEL=info
AUDIT_LOGGING_ENABLED=true
```

---

## Secrets Management

### DO NOT Store in Git

**Never commit these files:**
```gitignore
.env
.env.local
.env.*.local
.env.test
.env.koyeb.*
```

**Always commit:**
```
.env.example  # Template with placeholder values
```

### Use Secret Management Services

**Recommended for Production:**

1. **Koyeb Secrets**
   - Store via Koyeb Dashboard
   - Encrypted at rest
   - Accessible only to deployed services

2. **AWS Secrets Manager**
   ```bash
   # Store secret
   aws secretsmanager create-secret --name umrah/prod/db-url --secret-string "postgresql://..."

   # Retrieve in application
   const secret = await secretsManager.getSecretValue({ SecretId: 'umrah/prod/db-url' }).promise();
   ```

3. **HashiCorp Vault**
   ```bash
   # Store secret
   vault kv put secret/umrah/prod/database url="postgresql://..."

   # Retrieve in application
   vault kv get -field=url secret/umrah/prod/database
   ```

### Secret Rotation

**Recommended Schedule:**
- **API Keys**: Every 90 days
- **Database Passwords**: Every 180 days
- **JWT Secrets**: Every 365 days or on security incident

**Rotation Procedure:**
1. Generate new secret
2. Update both old and new in application (dual support)
3. Update all clients to use new secret
4. Remove old secret after grace period (7 days)
5. Revoke old secret

---

## Validation & Testing

### Environment Variable Validation

**Service:** `SecurityConfigService` validates on startup

```typescript
// Automatic validation on app start
validateConfiguration(): void {
  // Checks:
  // - No wildcard origins in production
  // - No HTTP origins in production
  // - HSTS max-age ≥ 1 year
  // - No unsafe CSP directives in production
}
```

### Manual Validation

```bash
# Check required variables are set
pnpm run security:check-config

# Verify database connection
pnpm run db:verify

# Test authentication
curl -X POST http://localhost:3000/auth/test \
  -H "Authorization: Bearer test-token"

# Test environment
pnpm run test:e2e:ci
```

### Environment-Specific Testing

**Development:**
```bash
NODE_ENV=development pnpm run test
```

**Production (CI):**
```bash
NODE_ENV=production pnpm run test:ci
```

---

## Common Configuration Patterns

### Local Development (Full Stack)

```bash
# Backend (.env)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://umrah_user:umrah_pass@localhost:5432/umrah_dev
AUTH_MODE=mock
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
WS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### Docker Compose Development

```bash
# Backend (.env)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://umrah_user:umrah_pass@postgres:5432/umrah_dev
ALLOWED_ORIGINS=http://localhost:3000
```

### CI/CD Pipeline

```bash
# GitHub Actions / GitLab CI
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/test_db
AUTH_MODE=mock
LOG_LEVEL=error
```

### Kubernetes Deployment

```yaml
# ConfigMap (non-sensitive)
apiVersion: v1
kind: ConfigMap
metadata:
  name: umrah-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"

# Secret (sensitive)
apiVersion: v1
kind: Secret
metadata:
  name: umrah-secrets
type: Opaque
data:
  DATABASE_URL: <base64-encoded>
  SUPABASE_JWT_SECRET: <base64-encoded>
  OPENAI_API_KEY: <base64-encoded>
```

---

## Troubleshooting

### Variable Not Loading

**Problem:** Environment variable not being read

**Solutions:**
1. Check file name is exactly `.env` (not `.env.txt`)
2. Verify file is in correct directory (`apps/backend/`)
3. Ensure no spaces around `=` sign (`KEY=value` not `KEY = value`)
4. Restart application after changing `.env`
5. Check for syntax errors (missing quotes for values with spaces)

### Database Connection Failed

**Problem:** Cannot connect to PostgreSQL

**Solutions:**
1. Verify `DATABASE_URL` format is correct
2. Check database server is running (`pg_isready`)
3. Test connection with `psql` using same URL
4. Verify user has correct permissions
5. Check firewall rules allow connection
6. For Docker: ensure network is configured correctly

### CORS Errors

**Problem:** Frontend blocked by CORS policy

**Solutions:**
1. Add frontend URL to `ALLOWED_ORIGINS`
2. Ensure no trailing slashes in origins
3. Check protocol matches (http vs https)
4. For WebSocket: verify `WS_ORIGIN` matches exactly
5. In development: temporarily use `ALLOWED_ORIGINS=*` (NOT production)

### Authentication Failures

**Problem:** JWT authentication not working

**Solutions:**
1. Verify `SUPABASE_JWT_SECRET` is correct public key
2. Check `AUTH_MODE` is set to `supabase`
3. Ensure token is not expired
4. Verify `Authorization: Bearer <token>` header format
5. Check token algorithm is RS256
6. For development: use `AUTH_MODE=mock` for testing

---

## Security Best Practices

### DO

✅ Use `.env.example` as template with placeholder values
✅ Set `.env` file permissions to 600 (owner read/write only)
✅ Use strong, unique passwords for all services
✅ Rotate secrets regularly (every 90-180 days)
✅ Use HTTPS in production (`https://` origins)
✅ Enable audit logging in production
✅ Use managed secret services for production
✅ Validate environment on startup
✅ Document all required variables in `.env.example`

### DON'T

❌ Commit `.env` files to git
❌ Share secrets via email, Slack, or messaging apps
❌ Use same secrets across environments
❌ Store secrets in application code
❌ Use weak or default passwords
❌ Disable security features in production
❌ Use HTTP origins in production
❌ Store secrets in plain text files on servers

---

## Environment Variables Reference Table

| Variable | Required | Default | Type | Description |
|----------|----------|---------|------|-------------|
| `NODE_ENV` | ✅ Yes | `development` | String | Node environment (development\|test\|production) |
| `PORT` | ✅ Yes | `3000` | Number | HTTP server port |
| `DATABASE_URL` | ✅ Yes | - | String | PostgreSQL connection string |
| `SUPABASE_JWT_SECRET` | ✅ Yes | - | String | Supabase JWT public key |
| `OPENAI_API_KEY` | ⚠️ Conditional | - | String | OpenAI API key (if AI features enabled) |
| `AUTH_MODE` | ✅ Yes | `supabase` | Enum | Authentication mode (mock\|supabase) |
| `ALLOWED_ORIGINS` | ✅ Yes | `http://localhost:3000` | String | Comma-separated CORS origins |
| `WS_ORIGIN` | ✅ Yes | `http://localhost:3000` | String | WebSocket origin validation |
| `WS_MSGPACK_ENABLED` | ❌ No | `false` | Boolean | Enable MessagePack WebSocket protocol |
| `PUBLIC_URL` | ❌ No | `http://localhost:3000` | String | Public-facing URL |
| `LOG_LEVEL` | ❌ No | `info` | String | Logging level |
| `RATE_LIMIT_MAX` | ❌ No | `100` | Number | Rate limit per window |
| `GRAPH_PATH` | ❌ No | `./data/nav_graph.json` | String | Navigation graph file path |
| `QURAN_DATA_PATH` | ❌ No | `./assets/quran` | String | Quran data directory |
| `CSP_MODE` | ❌ No | `enforce` | Enum | CSP mode (enforce\|report-only) |
| `PII_REDACTION_ENABLED` | ❌ No | `true` | Boolean | Enable PII redaction in logs |
| `AUDIT_LOGGING_ENABLED` | ❌ No | `false` | Boolean | Enable audit logging |

---

**Last Updated:** October 16, 2025
**Version:** 1.0.0
