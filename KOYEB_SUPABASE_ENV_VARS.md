# Koyeb Environment Variables - Supabase Production Setup

**Date:** 2025-11-01
**Purpose:** Enable Supabase authentication in production (Koyeb)

---

## 🚀 Quick Setup Instructions

### Step 1: Access Koyeb Dashboard

1. Go to: https://app.koyeb.com
2. Find your service: **umrah-hajj-realtime**
3. Click **Settings** → **Environment Variables**

### Step 2: Update/Add These Variables

Copy and paste these EXACT values into Koyeb:

```bash
# ========================================
# Authentication Mode
# ========================================
AUTH_MODE=supabase

# ========================================
# Supabase Configuration
# ========================================
SUPABASE_URL=https://qtrgbxuvjlblgkolgvxx.supabase.co

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmdieHV2amxibGdrb2xndnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkxMzksImV4cCI6MjA3NzU5NTEzOX0.MZTqMkE9TcerxmmAhJ_irL-v_YsXrp8B26alMGpWQi4

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmdieHV2amxibGdrb2xndnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxOTEzOSwiZXhwIjoyMDc3NTk1MTM5fQ.SBSksO4F7Rzu5K5eMmgDBlpvxNFeBrPTRXMJqXH3Vbg

SUPABASE_JWT_SECRET=MW5iHdtryL3qg1awPgXHcz0oPpdWyGNrmsABY9wnfmJdOgS2kQKSqUdbZVmLIWttNx8vIuLLv4IGWCEn7ys9KA==
```

### Step 3: Deploy

Click **Update Service** button to redeploy with new configuration.

---

## ✅ Verification Steps

### 1. Check Deployment Logs

After deployment completes, check Koyeb logs for:

```
✅ SUCCESS - You should see:
HTTP authentication running in SUPABASE mode
HTTP JWKS initialized with URI: https://qtrgbxuvjlblgkolgvxx.supabase.co/rest/v1/auth/jwks
```

```
❌ ERROR - If you see this:
HTTP authentication running in MOCK mode
→ AUTH_MODE is not set correctly, check environment variables
```

### 2. Test Authentication Endpoint

```bash
# This should now return 401 (mock tokens no longer work)
curl -X POST https://api.umrah.app/ai/voice/token \
  -H "Authorization: Bearer dummy-jwt-user123" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'

# Expected: {"statusCode":401,"message":"Unauthorized"}
```

### 3. Test with Real Supabase JWT

You need a real JWT token from Supabase. Frontend developers can get one by:

```javascript
// In frontend code
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qtrgbxuvjlblgkolgvxx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmdieHV2amxibGdrb2xndnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkxMzksImV4cCI6MjA3NzU5NTEzOX0.MZTqMkE9TcerxmmAhJ_irL-v_YsXrp8B26alMGpWQi4'
);

// Sign up a test user
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
});

console.log('JWT Token:', data.session.access_token);
```

Then test backend:

```bash
# Replace <TOKEN> with the JWT from above
curl -X POST https://api.umrah.app/ai/voice/token \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'

# Expected: 200 OK with voice token response
```

---

## 🔒 Security Notes

### What Each Key Does:

| Key | Purpose | Where to Use |
|-----|---------|--------------|
| `SUPABASE_URL` | Project endpoint | Frontend & Backend |
| `SUPABASE_ANON_KEY` | Public API access | Frontend (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access | Backend ONLY (secret!) |
| `SUPABASE_JWT_SECRET` | Token validation | Backend ONLY (secret!) |

### Important Security Rules:

✅ **DO:**
- Use `SUPABASE_ANON_KEY` in frontend code
- Keep `SERVICE_ROLE_KEY` and `JWT_SECRET` in Koyeb environment variables only
- Store these in password manager or secure vault

❌ **DON'T:**
- Never commit `SERVICE_ROLE_KEY` or `JWT_SECRET` to git
- Never use `SERVICE_ROLE_KEY` in frontend/mobile apps
- Never log these values in application code
- Never share via chat/email without encryption

---

## 📋 Complete Environment Variables Checklist

Make sure ALL these variables are set in Koyeb:

### Required (Core)
- [x] `NODE_ENV=production`
- [x] `PORT=8000` (or auto-detected by Koyeb)
- [x] `AUTH_MODE=supabase`

### Required (Supabase)
- [x] `SUPABASE_URL`
- [x] `SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `SUPABASE_JWT_SECRET`

### Required (CORS)
- [ ] `ALLOWED_ORIGINS` (add your frontend URLs)
- [ ] `WS_ORIGIN` (add your frontend URL)

Example:
```bash
ALLOWED_ORIGINS=https://your-frontend.netlify.app,https://your-app.com
WS_ORIGIN=https://your-frontend.netlify.app
```

### Optional (Database)
- [ ] `DATABASE_URL` (if using PostgreSQL)

### Optional (Features)
- [ ] `OPENAI_API_KEY` (if using AI features)
- [ ] `ENABLE_MSGPACK=false` (WebSocket protocol)

---

## 🆘 Troubleshooting

### Issue: Mock mode still active after deploy

**Symptoms:**
```
HTTP authentication running in MOCK mode
```

**Solution:**
1. Verify `AUTH_MODE=supabase` is set in Koyeb (not `AUTH_MODE=mock`)
2. Redeploy the service
3. Check logs again

### Issue: "SUPABASE_URL environment variable is required"

**Symptoms:**
```
Error: SUPABASE_URL environment variable is required for Supabase auth mode
```

**Solution:**
1. Add `SUPABASE_URL=https://qtrgbxuvjlblgkolgvxx.supabase.co` to Koyeb
2. Redeploy

### Issue: "Invalid JWT" errors

**Symptoms:**
```
{"statusCode":401,"message":"Invalid token"}
```

**Solution:**
1. Verify `SUPABASE_JWT_SECRET` matches the one from Supabase dashboard
2. Ensure the JWT token from frontend is not expired
3. Check token format is correct (starts with `eyJ...`)

### Issue: CORS errors in frontend

**Symptoms:**
```
Access to fetch at 'https://api.umrah.app' has been blocked by CORS policy
```

**Solution:**
1. Add your frontend URL to `ALLOWED_ORIGINS`:
   ```bash
   ALLOWED_ORIGINS=https://your-frontend.netlify.app,https://your-app.com
   ```
2. Add to `WS_ORIGIN` for WebSocket:
   ```bash
   WS_ORIGIN=https://your-frontend.netlify.app
   ```
3. Redeploy

---

## 📖 Related Documentation

- **Supabase Setup Guide:** `SUPABASE_PRODUCTION_SETUP.md`
- **Authentication Docs:** `docs/authentication/README.md`
- **Frontend Integration:** `SUPABASE_PRODUCTION_SETUP.md` (section 2)
- **Koyeb Dashboard:** https://app.koyeb.com
- **Supabase Dashboard:** https://supabase.com/dashboard/project/qtrgbxuvjlblgkolgvxx

---

## 🎯 Summary

**What Changed:**
- ❌ Old: `AUTH_MODE=mock` (fake authentication)
- ✅ New: `AUTH_MODE=supabase` (real authentication)

**Impact:**
- Mock tokens (`dummy-jwt-*`) will NO LONGER WORK
- Only real Supabase JWT tokens will be accepted
- Frontend must integrate Supabase client and get real tokens
- Users can now register, login, and authenticate properly

**Next Steps:**
1. Update Koyeb environment variables (above)
2. Deploy to production
3. Verify logs show "SUPABASE mode"
4. Update frontend to use Supabase authentication
5. Test end-to-end flow

---

**Created:** 2025-11-01
**Status:** ✅ Ready to Deploy
**Backend:** Ready with Supabase credentials
**Production:** Pending Koyeb environment variable update
