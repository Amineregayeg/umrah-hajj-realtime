# Koyeb Deployment Checklist

## Quick Staging Deployment (Mock Auth)

### ✅ Pre-Deployment Checklist

- [x] GitHub repository created: `Amineregayeg/umrah-hajj-realtime`
- [x] Deployment branch pushed: `deploy/koyeb-setup`
- [x] Neon PostgreSQL database created
- [x] Connection string obtained
- [ ] Koyeb account created

---

## Step 1: Create Koyeb Service

1. Go to https://koyeb.com and sign up/login
2. Click **"Create Web Service"**
3. Select **"GitHub"** as source
4. Connect your GitHub account if not already connected
5. Select repository: **`Amineregayeg/umrah-hajj-realtime`**
6. Select branch: **`deploy/koyeb-setup`** (or merge to `main` first)

---

## Step 2: Configure Builder Settings

### ⚠️ CRITICAL: Docker Build Configuration

```
Builder: Docker
Dockerfile path: apps/backend/Dockerfile
Build context: .   (repo root - DO NOT use apps/backend)
```

**Why this matters:** The Dockerfile uses paths like `COPY pnpm-lock.yaml` which are at the repo root. If you set context to `apps/backend`, the build will fail.

---

## Step 3: Configure Service Settings

### Port Configuration
- **Internal Port:** `3000` (or leave default - Koyeb will inject PORT env var)

### Health Check
- **Path:** `/metrics/healthz`
- **Port:** Same as internal port
- **Initial Delay:** 40 seconds
- **Timeout:** 10 seconds
- **Interval:** 30 seconds

### Instance Type
- **Staging:** Nano (free tier - sufficient for testing)
- **Production:** Micro or Small (recommended for real workloads)

### Region
- Choose closest to your users
- Suggested: `fra` (Frankfurt) or `was` (Washington) for global reach

---

## Step 4: Set Environment Variables

Copy these from `apps/backend/.env.koyeb.staging`:

### Required Variables

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://neondb_owner:npg_cX37PBfohMqZ@ep-summer-cherry-a1mtg9rw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
AUTH_MODE=mock
PRAYER_DEFAULT_METHOD=4
WS_MSGPACK_ENABLED=false
ENABLE_MSGPACK=false
```

### Update After Deployment

After you get your Koyeb URL (e.g., `https://your-app.koyeb.app`), go back and update:

```bash
ALLOWED_ORIGINS=https://your-app.koyeb.app,http://localhost:3000
WS_ORIGIN=https://your-app.koyeb.app
```

---

## Step 5: Deploy!

1. Click **"Deploy"**
2. Wait for build to complete (~5-10 minutes)
3. Monitor build logs for any errors
4. Once deployed, you'll get a URL like: `https://your-app.koyeb.app`

---

## Step 6: Post-Deployment Verification

### Save Your App URL
```bash
export KOYEB_URL="https://your-app.koyeb.app"
```

### Test Health Endpoint
```bash
curl -s $KOYEB_URL/metrics/healthz | jq .
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-16T12:00:00.000Z",
  "uptime": 123.456,
  "memory": {...},
  "database": "connected"
}
```

### Test Swagger Documentation
Open in browser: `https://your-app.koyeb.app/docs`

### Test Qur'an Content
```bash
curl -s "$KOYEB_URL/content/quran/surah/1?lang=ar" | jq .
```

### Test Qibla Direction
```bash
curl -s "$KOYEB_URL/content/qibla?lat=21.4225&lng=39.8262" | jq .
```

### Test WebSocket Connection
```bash
# Install wscat if you don't have it
npm install -g wscat

# Connect with mock auth
wscat -c "$KOYEB_URL/ws?token=MOCK"
```

**Expected:** Connection established, you can send test messages

### Test Security Headers
```bash
curl -I $KOYEB_URL/metrics/healthz | grep -E "X-Content-Type-Options|X-Frame-Options|Strict-Transport-Security"
```

**Expected Headers:**
```
x-content-type-options: nosniff
x-frame-options: DENY
strict-transport-security: max-age=31536000; includeSubDomains
```

---

## Step 7: Update Environment Variables

Now that you have your Koyeb URL, go back to Koyeb service settings and update:

1. Go to your service settings
2. Navigate to "Environment Variables"
3. Update these variables:

```bash
ALLOWED_ORIGINS=https://your-actual-app.koyeb.app,http://localhost:3000
WS_ORIGIN=https://your-actual-app.koyeb.app
```

4. Redeploy the service for changes to take effect

---

## Step 8: Share with Unity/3D Team

### Share These Resources:

1. **Backend URL:** `https://your-app.koyeb.app`
2. **Swagger Docs:** `https://your-app.koyeb.app/docs`
3. **WebSocket Endpoint:** `wss://your-app.koyeb.app/ws?token=MOCK`
4. **Documentation:**
   - `docs/UNITY_QUICKSTART.md` - Quick start guide
   - `docs/UNITY_INTEGRATION_GUIDE.md` - Full integration details
   - `shared/ws-types/` - TypeScript event contracts

### Mock Authentication Note:
Tell them to use `?token=MOCK` (or any string) for WebSocket connections. This will be replaced with real Supabase JWT later without breaking their code.

---

## Troubleshooting

### Build Fails: "COPY failed: file not found"
- ✅ **Fix:** Make sure Build context is set to `.` (repo root), not `apps/backend`

### Database Connection Error
- Check DATABASE_URL format includes `?sslmode=require`
- Verify Neon database is active (not paused)
- Check Koyeb can reach external databases (should work by default)

### Health Check Fails
- Check build logs for startup errors
- Verify Prisma migrations ran successfully
- Increase health check initial delay to 60 seconds

### WebSocket Connection Refused
- Verify WS_ORIGIN matches your Koyeb URL
- Check that PORT env var is set correctly
- Try with `?token=MOCK` in the connection URL

### CORS Errors from Frontend
- Update ALLOWED_ORIGINS to include your frontend domain
- Format: `https://domain.com` (no trailing slash)
- Separate multiple origins with commas

---

## Migration to Production Auth

When you're ready to use real Supabase authentication:

1. Create or reuse a Supabase project
2. Get JWKS endpoint: `https://YOUR_PROJECT.supabase.co/auth/v1/jwks`
3. Update environment variables:
   ```bash
   AUTH_MODE=supabase
   SUPABASE_JWT_JWKS=https://YOUR_PROJECT.supabase.co/auth/v1/jwks
   ```
4. Update Unity clients to pass real Supabase JWT tokens
5. Redeploy

The event contracts remain the same - no Unity code changes needed!

---

## Next Steps

- [ ] Deploy to Koyeb
- [ ] Verify all endpoints
- [ ] Share URL with Unity team
- [ ] Set up monitoring (Koyeb provides basic metrics)
- [ ] (Later) Switch to real Supabase auth
- [ ] (Later) Add custom domain
- [ ] (Later) Run Gate-C audit against live deployment

---

## Support

If you encounter issues:
1. Check Koyeb build logs
2. Check runtime logs in Koyeb dashboard
3. Review `docs/DEPLOY_KOYEB.md` for detailed troubleshooting
4. Check Neon database status
