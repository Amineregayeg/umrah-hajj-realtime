# Authentication System Documentation

**Version:** 1.0.0
**Last Updated:** October 27, 2025
**Status:** Production Ready ✅

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Configuration](#configuration)
5. [Endpoints](#endpoints)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Security](#security)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Umrah Hajj Real-time API implements a comprehensive authentication system using **Supabase JWT** for production and **Mock authentication** for development/testing.

### Key Features

✅ **Supabase JWT Authentication** - Production-ready OAuth integration
✅ **Mock Authentication Mode** - Development without external dependencies
✅ **WebSocket Authentication** - Real-time connection security
✅ **JWT Key Rotation** - Automatic JWKS fetching and validation
✅ **Rate Limiting** - Per-user request throttling
✅ **Audit Logging** - Comprehensive security event tracking
✅ **PII Redaction** - Automatic sensitive data protection in logs

### System Requirements

- Node.js 20.x LTS
- NestJS 10.x
- Supabase account (production only)
- PostgreSQL (for audit logs)

---

## Quick Start

### Development Mode (Mock Auth)

```bash
# 1. Set environment variables
export AUTH_MODE=mock
export NODE_ENV=development

# 2. Start the server
pnpm run start:dev

# 3. Test with mock token
curl -X POST http://localhost:3001/ai/voice/token \
  -H "Authorization: Bearer dummy-jwt-user123" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'
```

### Production Mode (Supabase)

```bash
# 1. Configure Supabase
export AUTH_MODE=supabase
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_JWT_SECRET=your-jwt-secret
export NODE_ENV=production

# 2. Start the server
pnpm run start:prod

# 3. Test with real JWT
curl -X POST https://your-api.com/ai/voice/token \
  -H "Authorization: Bearer <REAL_SUPABASE_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'
```

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    Client Request                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              HTTP/WebSocket Gateway                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│           SupabaseJwtGuard (auth guard)                 │
│  • Token extraction (Header/Query)                      │
│  • Mode detection (Mock/Supabase)                       │
│  • JWT validation                                       │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌─────────────────┐       ┌─────────────────┐
│   Mock Mode     │       │  Supabase Mode  │
│  • Test tokens  │       │  • JWKS fetch   │
│  • User ID ext. │       │  • RS256 verify │
└─────────────────┘       └─────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 Protected Endpoint                       │
│  • Voice Token Service                                  │
│  • Navigation Snapshot                                  │
│  • WebSocket Connection                                 │
└─────────────────────────────────────────────────────────┘
```

### Module Structure

```
apps/backend/src/
├── auth/
│   ├── auth.module.ts                    # Auth module configuration
│   ├── guards/
│   │   ├── supabase-jwt.guard.ts        # Main JWT guard implementation
│   │   └── supabase-jwt.guard.spec.ts   # Guard unit tests
│   └── test/
│       └── supabase-jwt-guard-comprehensive.spec.ts
│
├── security/
│   ├── security.module.ts                # Security module (global)
│   ├── security-config.service.ts        # CSP, HSTS, CORS config
│   ├── jwt-rotation.service.ts           # JWT key rotation
│   ├── log-redaction.service.ts          # PII redaction
│   └── test/
│       ├── jwt-rotation.service.spec.ts
│       └── log-redaction.service.spec.ts
│
├── shared/
│   └── utils/
│       ├── ws-auth.util.ts               # WebSocket authentication
│       └── security-init.util.ts         # Security middleware setup
│
└── ai/
    └── services/
        └── voice-token.service.ts        # Voice token generation (protected)
```

---

## Configuration

### Environment Variables

#### Required for All Environments

```bash
# Server Configuration
NODE_ENV=development|production
PORT=3001

# Authentication Mode
AUTH_MODE=mock|supabase

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
WS_ORIGIN=http://localhost:3000
```

#### Required for Production (Supabase Mode)

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_JWT_JWKS=https://your-project.supabase.co/rest/v1/auth/jwks

# JWT Configuration
JWT_SECRET=your-jwt-secret-for-voice-tokens

# Security Features
AUDIT_LOGGING_ENABLED=true
LOG_REDACTION_ENABLED=true
```

#### Optional Configuration

```bash
# Rate Limiting (Voice Token)
VOICE_TOKEN_RATE_LIMIT_MAX=5           # Requests per minute
VOICE_TOKEN_RATE_LIMIT_WINDOW=60000    # Window in ms
VOICE_TOKEN_BURST_CAPACITY=10          # Burst allowance

# JWT Key Rotation
JWKS_CACHE_TTL=3600000                 # Cache TTL (1 hour)
JWT_ROTATION_GRACE_PERIOD=300000       # Grace period (5 min)

# Audit Logging
AUDIT_LOG_RETENTION_DAYS=90            # Log retention period
```

### Configuration Files

**Development:** `apps/backend/.env`
```bash
AUTH_MODE=mock
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Production:** Set via Koyeb environment variables
```bash
AUTH_MODE=supabase
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=https://your-frontend.netlify.app
```

---

## Endpoints

### Protected Endpoints (Require Authentication)

#### 1. Voice Token Generation

**Endpoint:** `POST /ai/voice/token`
**Auth:** Required (`@UseGuards(SupabaseJwtGuard)`)
**Rate Limit:** 5 requests/minute per user

**Request:**
```bash
curl -X POST https://api.example.com/ai/voice/token \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ar",
    "gender": "male",
    "sessionId": "optional-session-id"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1703080860,
  "ttl": 60,
  "scope": ["realtime.voice"],
  "language": "ar",
  "gender": "male"
}
```

**Supported Languages:**
- `ar` - Arabic
- `en` - English
- `ur` - Urdu
- `id` - Indonesian
- `fr` - French
- `tr` - Turkish
- `fa` - Persian
- `es` - Spanish
- `bn` - Bengali
- `ms` - Malay

#### 2. Navigation Snapshot

**Endpoint:** `POST /nav/snapshot`
**Auth:** Required (`@UseGuards(SupabaseJwtGuard)`)
**Rate Limit:** 1 request/minute per user

**Request:**
```bash
curl -X POST https://api.example.com/nav/snapshot \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 21.4225,
    "longitude": 39.8262,
    "floor": 1,
    "timestamp": "2025-10-27T10:00:00Z"
  }'
```

#### 3. WebSocket Connection

**Endpoint:** `wss://api.example.com`
**Auth:** Required (JWT in Authorization header or query param)

**Connection:**
```javascript
// Option 1: Header-based auth
const ws = new WebSocket('wss://api.example.com', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});

// Option 2: Query parameter auth
const ws = new WebSocket(`wss://api.example.com?token=${jwtToken}`);
```

### Public Endpoints (No Authentication)

- `GET /health` - Health check
- `GET /content/qibla` - Qibla direction calculator
- `GET /content/quran/surah/:id` - Quran content
- `GET /docs` - API documentation (Swagger)

---

## Testing

### Unit Tests

```bash
# Run all authentication tests
pnpm test src/auth

# Run security tests
pnpm test src/security

# Run with coverage
pnpm test:cov
```

### Integration Tests

```bash
# Test voice token endpoint
node apps/backend/src/ai/demo-voice-token.js

# Test with mock auth
AUTH_MODE=mock pnpm test:e2e
```

### Manual Testing

#### Test Mock Authentication

```bash
# 1. Start server in mock mode
AUTH_MODE=mock pnpm run start:dev

# 2. Test with mock token (user ID: user123)
curl -X POST http://localhost:3001/ai/voice/token \
  -H "Authorization: Bearer dummy-jwt-user123" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'

# Expected: 200 OK with voice token
```

#### Test Supabase Authentication

```bash
# 1. Get real JWT from Supabase
# (Use Supabase Auth UI or API to get token)

# 2. Test with real token
curl -X POST https://your-api.com/ai/voice/token \
  -H "Authorization: Bearer <REAL_SUPABASE_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'

# Expected: 200 OK with voice token
```

#### Test Rate Limiting

```bash
# Send 6 requests rapidly (limit is 5/minute)
for i in {1..6}; do
  curl -X POST http://localhost:3001/ai/voice/token \
    -H "Authorization: Bearer dummy-jwt-user123" \
    -H "Content-Type: application/json" \
    -d '{"language":"ar","gender":"male"}'
  echo "\nRequest $i"
done

# Expected: First 5 succeed, 6th returns 429 Too Many Requests
```

### Test Coverage

Current coverage (as of October 2025):
- **Statements:** 73.2%
- **Branches:** 65.8%
- **Functions:** 70.1%
- **Lines:** 72.8%

---

## Deployment

### Development Deployment

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start development server
pnpm run start:dev
```

### Production Deployment (Koyeb)

#### Step 1: Configure Environment Variables

In Koyeb dashboard, set these variables:

```bash
NODE_ENV=production
AUTH_MODE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-for-voice-tokens
ALLOWED_ORIGINS=https://your-frontend.netlify.app,https://your-app.com
WS_ORIGIN=https://your-frontend.netlify.app
AUDIT_LOGGING_ENABLED=true
```

#### Step 2: Deploy

```bash
# Deploy via Git push
git push origin main

# Or deploy via Koyeb CLI
koyeb service deploy
```

#### Step 3: Verify

```bash
# Check health
curl https://your-api.koyeb.app/health

# Verify authentication
curl -X POST https://your-api.koyeb.app/ai/voice/token \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'
```

### Production Checklist

Before going live, ensure:

- [ ] `NODE_ENV=production`
- [ ] `AUTH_MODE=supabase` (not mock)
- [ ] Valid Supabase configuration
- [ ] HTTPS-only `ALLOWED_ORIGINS`
- [ ] `AUDIT_LOGGING_ENABLED=true`
- [ ] Rate limiting configured
- [ ] JWT secrets are strong (32+ characters)
- [ ] CORS properly configured
- [ ] All tests passing
- [ ] Security headers enabled
- [ ] Monitoring/logging configured

---

## Security

### Authentication Flow

1. **Client obtains JWT** from Supabase Auth
2. **Client sends request** with `Authorization: Bearer <JWT>` header
3. **Guard extracts token** from header or query parameter
4. **Guard validates token:**
   - Mock mode: Extracts user ID from token format
   - Supabase mode: Fetches JWKS and verifies RS256 signature
5. **Guard validates claims:**
   - `sub` (subject/user ID) must exist
   - `aud` (audience) must be "authenticated"
   - `exp` (expiration) must be in future
6. **Request proceeds** if validation passes
7. **User context** attached to request object

### Token Format

#### Mock Token Format

```
Bearer dummy-jwt-{userId}

Example: Bearer dummy-jwt-user123
```

#### Supabase JWT Format

```javascript
{
  "sub": "user-uuid-here",           // User ID
  "aud": "authenticated",            // Audience
  "exp": 1703080860,                 // Expiration timestamp
  "iat": 1703080800,                 // Issued at timestamp
  "email": "user@example.com",       // User email
  "role": "authenticated"            // User role
}
```

### Voice Token Format

```javascript
{
  "sub": "user-uuid-here",           // User ID
  "exp": 1703080860,                 // Expiration (max 60s)
  "iat": 1703080800,                 // Issued at
  "scope": ["realtime.voice"],       // Allowed scopes
  "lang": "ar",                      // Language
  "gender": "male",                  // Voice gender
  "sessionId": "optional-id"         // Session tracking
}
```

### Security Best Practices

#### JWT Secrets

```bash
# ❌ NEVER use weak secrets
JWT_SECRET=secret123

# ✅ Use strong random secrets (32+ chars)
JWT_SECRET=$(openssl rand -base64 32)
SUPABASE_JWT_SECRET=your-long-random-secret-from-supabase
```

#### CORS Configuration

```bash
# ❌ NEVER allow all origins in production
ALLOWED_ORIGINS=*

# ✅ Explicitly list allowed origins
ALLOWED_ORIGINS=https://your-app.com,https://your-frontend.netlify.app
```

#### Rate Limiting

- Voice token: 5 requests/minute, burst 10
- Navigation snapshot: 1 request/minute
- Adjust based on your usage patterns

#### Audit Logging

All authentication events are logged:
- Token generation (INFO)
- Failed authentication (WARN)
- Rate limit exceeded (WARN)
- Invalid tokens (WARN)

Logs include:
- Timestamp
- User ID
- Event type
- IP address (redacted)
- User agent (redacted)

### Common Vulnerabilities Protected Against

✅ **JWT Signature Forgery** - RS256 signature verification with JWKS
✅ **Token Replay Attacks** - Short TTL (60s max for voice tokens)
✅ **Rate Limiting Bypass** - Per-user rate limits with burst capacity
✅ **CORS Attacks** - Strict origin validation
✅ **XSS Attacks** - CSP headers, nonce-based inline scripts
✅ **Clickjacking** - X-Frame-Options: DENY
✅ **MITM Attacks** - HSTS, HTTPS-only
✅ **Sensitive Data Exposure** - PII redaction in logs

---

## Troubleshooting

### Common Issues

#### Issue: "Unauthorized" (401) Error

**Symptoms:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Causes & Solutions:**

1. **Missing Authorization header**
   ```bash
   # ❌ Wrong
   curl https://api.example.com/ai/voice/token

   # ✅ Correct
   curl -H "Authorization: Bearer <JWT>" https://api.example.com/ai/voice/token
   ```

2. **Invalid token format**
   ```bash
   # ❌ Wrong (mock mode)
   Authorization: Bearer user123

   # ✅ Correct (mock mode)
   Authorization: Bearer dummy-jwt-user123
   ```

3. **Expired token**
   - Get a new JWT from Supabase Auth
   - Check token expiration: `jwt.exp < Date.now() / 1000`

4. **Wrong AUTH_MODE**
   - Check server logs for "Authentication mode: mock" or "supabase"
   - Ensure AUTH_MODE matches your token type

#### Issue: "Rate limit exceeded" (429)

**Symptoms:**
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Please try again later."
}
```

**Solutions:**
- Wait 60 seconds before retrying
- Reduce request frequency
- Implement exponential backoff in client
- Check if burst capacity is sufficient

#### Issue: CORS Error in Browser

**Symptoms:**
```
Access to fetch at 'https://api.example.com' from origin 'https://your-app.com'
has been blocked by CORS policy
```

**Solutions:**
1. Add your frontend URL to `ALLOWED_ORIGINS`:
   ```bash
   ALLOWED_ORIGINS=https://your-app.com,https://your-frontend.netlify.app
   ```

2. Redeploy backend for changes to take effect

3. Verify with curl:
   ```bash
   curl -i https://api.example.com/health \
     -H "Origin: https://your-app.com" | grep -i access-control

   # Expected:
   # access-control-allow-origin: https://your-app.com
   ```

#### Issue: WebSocket Connection Failed

**Symptoms:**
- Connection immediately closes
- "WebSocket connection failed" error

**Solutions:**

1. **Check token format:**
   ```javascript
   // ✅ Correct
   const ws = new WebSocket('wss://api.example.com', {
     headers: { 'Authorization': `Bearer ${token}` }
   });

   // Or with query param
   const ws = new WebSocket(`wss://api.example.com?token=${token}`);
   ```

2. **Check WS_ORIGIN:**
   ```bash
   # Must include your frontend URL
   WS_ORIGIN=https://your-app.com
   ```

3. **Check logs:**
   ```bash
   # Look for WebSocket auth errors
   # In Koyeb: Services → Logs
   # Search for: "WebSocket authentication failed"
   ```

#### Issue: Mock Mode Not Working

**Symptoms:**
- 401 errors even with mock token
- Server expects Supabase JWT

**Solutions:**

1. **Verify AUTH_MODE:**
   ```bash
   # Check .env file
   cat .env | grep AUTH_MODE

   # Should show:
   # AUTH_MODE=mock
   ```

2. **Restart server:**
   ```bash
   # Environment changes require restart
   pnpm run start:dev
   ```

3. **Check server logs:**
   ```bash
   # Look for startup message:
   # "Authentication mode: mock" ✅
   # or
   # "Authentication mode: supabase" ❌ (if you wanted mock)
   ```

### Debug Commands

```bash
# Check authentication mode
grep AUTH_MODE .env

# Test health endpoint (no auth required)
curl http://localhost:3001/health

# Test auth with mock token
curl -X POST http://localhost:3001/ai/voice/token \
  -H "Authorization: Bearer dummy-jwt-test123" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}' \
  -v  # Verbose mode shows full request/response

# Check CORS headers
curl -i http://localhost:3001/health \
  -H "Origin: http://localhost:3000" | grep -i access-control

# View logs in real-time
pnpm run start:dev | grep -i "auth\|jwt\|token"
```

### Getting Help

1. **Check logs:**
   - Development: Console output
   - Production: Koyeb dashboard → Logs

2. **Enable debug mode:**
   ```bash
   LOG_LEVEL=debug pnpm run start:dev
   ```

3. **Run tests:**
   ```bash
   pnpm test src/auth
   ```

4. **Review documentation:**
   - This README
   - `docs/SECURITY_HEADERS.md`
   - API docs: `http://localhost:3001/docs`

5. **Contact team:**
   - Create GitHub issue
   - Tag: @auth-team

---

## Additional Resources

### Related Documentation

- [Security Implementation Report](../../apps/backend/SECURITY_IMPLEMENTATION_REPORT.md)
- [Security Headers](../SECURITY_HEADERS.md)
- [API Documentation](https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/docs)

### External Links

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT.io](https://jwt.io/) - JWT debugger
- [NestJS Guards](https://docs.nestjs.com/guards)
- [jose Library](https://github.com/panva/jose) - JWT implementation

### Code References

- **JWT Guard:** `apps/backend/src/auth/guards/supabase-jwt.guard.ts`
- **WebSocket Auth:** `apps/backend/src/shared/utils/ws-auth.util.ts`
- **JWT Rotation:** `apps/backend/src/security/jwt-rotation.service.ts`
- **Voice Token:** `apps/backend/src/ai/services/voice-token.service.ts`

---

## Changelog

### Version 1.0.0 (October 2025)

- ✅ Initial production release
- ✅ Supabase JWT authentication
- ✅ Mock authentication mode
- ✅ WebSocket authentication
- ✅ JWT key rotation
- ✅ Voice token service
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Comprehensive tests (73.2% coverage)

---

**Maintained by:** Backend Engineering Team
**Contact:** @auth-team on GitHub
**License:** Proprietary
**Repository:** https://github.com/Amineregayeg/umrah-hajj-realtime
