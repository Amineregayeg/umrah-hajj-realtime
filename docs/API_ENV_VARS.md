# API Environment Variables Reference

Complete reference for all environment variables used by the Umrah Hajj Real-time backend API.

## Core Application

### `NODE_ENV`
- **Purpose**: Sets the runtime environment
- **Values**: `development` | `production` | `test`
- **Default**: `development`
- **Required**: Yes (for production)
- **Example**: `NODE_ENV=production`
- **Notes**:
  - Affects CORS policy (stricter in production)
  - Changes logging verbosity
  - Disables certain development-only features

### `PORT`
- **Purpose**: HTTP server port
- **Default**: `3000`
- **Required**: No (Koyeb injects automatically)
- **Example**: `PORT=8000`
- **Notes**: Koyeb typically uses port 8000; app reads from `process.env.PORT`

## Security & Authentication

### `AUTH_MODE`
- **Purpose**: Authentication strategy
- **Values**: `mock` | `supabase` | `jwt`
- **Default**: `mock`
- **Required**: Yes
- **Example**: `AUTH_MODE=mock`
- **Notes**:
  - `mock`: No real authentication, uses dummy user (for development/staging)
  - `supabase`: Uses Supabase JWT validation with JWKS
  - `jwt`: Generic JWT validation (requires custom configuration)

### `SUPABASE_JWT_JWKS`
- **Purpose**: Supabase JWKS endpoint for JWT signature verification
- **Required**: Yes (when `AUTH_MODE=supabase`)
- **Example**: `SUPABASE_JWT_JWKS=https://your-project.supabase.co/auth/v1/jwks`
- **Notes**: Obtainable from your Supabase project settings

### `CORS_ORIGINS` / `ALLOWED_ORIGINS`
- **Purpose**: Comma-separated list of allowed CORS origins
- **Default**: `http://localhost:3000`
- **Required**: Yes (for production)
- **Example**: `CORS_ORIGINS=https://app.koyeb.com,https://yourdomain.com`
- **Notes**:
  - Both variables are used interchangeably in the codebase
  - Must match frontend domain exactly (including protocol)
  - No trailing slashes

### `WS_ORIGIN`
- **Purpose**: Strict WebSocket origin validation (single origin)
- **Default**: `http://localhost:3000`
- **Required**: Yes (for production)
- **Example**: `WS_ORIGIN=https://YOUR_APP.koyeb.app`
- **Notes**:
  - **CRITICAL**: WebSocket connections are rejected if origin doesn't match exactly
  - Must include protocol (`https://`)
  - Only one origin supported (unlike `CORS_ORIGINS`)

## Database

### `DATABASE_URL`
- **Purpose**: PostgreSQL connection string
- **Required**: Yes
- **Example**: `DATABASE_URL=postgresql://user:password@host.neon.tech:5432/mydb?sslmode=require`
- **Notes**:
  - Format: `postgresql://[user]:[password]@[host]:[port]/[database][?options]`
  - **Always use `?sslmode=require`** for remote databases
  - Neon, Supabase, and most cloud Postgres providers require SSL

## WebSocket & Protocol

### `ENABLE_MSGPACK` / `WS_MSGPACK_ENABLED`
- **Purpose**: Enable MessagePack binary protocol for WebSockets
- **Values**: `true` | `false`
- **Default**: `false`
- **Required**: No
- **Example**: `ENABLE_MSGPACK=false`
- **Notes**:
  - When `false`: JSON text frames (more compatible, easier debugging)
  - When `true`: Binary MessagePack frames (smaller payload, faster)
  - Both variables checked for backward compatibility

## Prayer & Qibla Configuration

### `PRAYER_DEFAULT_METHOD`
- **Purpose**: Prayer time calculation method
- **Values**: `UmmAlQura` | `ISNA` | `MWL` | `Makkah` | `Egypt` | `Tehran` | `Karachi`
- **Default**: `UmmAlQura`
- **Required**: No
- **Example**: `PRAYER_DEFAULT_METHOD=UmmAlQura`
- **Notes**: UmmAlQura is recommended for Mecca/Medina region

## Logging & Monitoring

### `AUDIT_LOGGING_ENABLED`
- **Purpose**: Enable security audit logging for sensitive operations
- **Values**: `true` | `false`
- **Default**: `true`
- **Required**: No
- **Example**: `AUDIT_LOGGING_ENABLED=true`
- **Notes**: Logs authentication attempts, voice token issuance, admin actions

### `LOG_LEVEL`
- **Purpose**: Minimum log level
- **Values**: `error` | `warn` | `info` | `debug` | `verbose`
- **Default**: `info`
- **Required**: No
- **Example**: `LOG_LEVEL=warn`
- **Notes**: Set to `warn` or `error` in production to reduce log volume

## Rate Limiting (AI Voice Tokens)

### `RATE_LIMIT_WINDOW`
- **Purpose**: Rate limit time window in milliseconds
- **Default**: `60000` (1 minute)
- **Required**: No
- **Example**: `RATE_LIMIT_WINDOW=60000`
- **Notes**: Used for AI voice token endpoint (`POST /ai/voice/token`)

### `RATE_LIMIT_MAX`
- **Purpose**: Maximum requests per window per user
- **Default**: `5`
- **Required**: No
- **Example**: `RATE_LIMIT_MAX=5`
- **Notes**: Burst limit is 2x this value (default: 10)

## AI & OpenAI Integration

### `OPENAI_API_KEY`
- **Purpose**: OpenAI API key for AI features
- **Required**: Yes (if using AI endpoints)
- **Example**: `OPENAI_API_KEY=sk-...`
- **Notes**: Keep this secret; never commit to version control

### `OPENAI_ORG_ID`
- **Purpose**: OpenAI organization ID
- **Required**: No
- **Example**: `OPENAI_ORG_ID=org-...`
- **Notes**: Optional, for organization-level billing/usage tracking

## Complete Staging Example (.env.koyeb.example)

```bash
# ========================================
# Koyeb Staging Environment
# ========================================

# Core
NODE_ENV=production
PORT=8000

# Authentication (mock mode for staging)
AUTH_MODE=mock

# CORS & WebSocket Origins
CORS_ORIGINS=https://YOUR_APP_NAME.koyeb.app
ALLOWED_ORIGINS=https://YOUR_APP_NAME.koyeb.app
WS_ORIGIN=https://YOUR_APP_NAME.koyeb.app

# Database (Neon Postgres)
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech:5432/DATABASE?sslmode=require

# Protocol
ENABLE_MSGPACK=false
WS_MSGPACK_ENABLED=false

# Prayer Configuration
PRAYER_DEFAULT_METHOD=UmmAlQura

# Logging
AUDIT_LOGGING_ENABLED=true
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=5

# AI (Optional - only if using AI features)
# OPENAI_API_KEY=sk-...
```

## Production Recommendations

1. **Always set** `NODE_ENV=production`
2. **Use SSL** for database connections (`?sslmode=require`)
3. **Match origins exactly** - no wildcards, include protocol
4. **Keep secrets in Koyeb** - don't commit `.env` files
5. **Enable audit logging** in production
6. **Use Supabase auth** instead of mock mode
7. **Set log level** to `warn` or `error` to reduce noise

## Validation

The app validates critical config on startup (see `src/security/security-config.service.ts` and `src/shared/utils/security-init.util.ts`). If validation fails, the app will not start.

Required validation checks:
- `DATABASE_URL` must be set and valid
- `NODE_ENV` must be `production` in staging/production
- `WS_ORIGIN` must be set when `NODE_ENV=production`
- `CORS_ORIGINS` must be set when `NODE_ENV=production`

## Debugging

If the app fails to start, check logs for:
```
[Security] Configuration validation failed: ...
[Bootstrap] DATABASE_URL not set
[WebSocket] Origin validation failed: ...
```

## Further Reading

- [Deployment Guide](./DEPLOY_KOYEB.md)
- [Security Headers](./SECURITY_HEADERS.md)
- [Unity Integration](./UNITY_INTEGRATION_GUIDE.md)
