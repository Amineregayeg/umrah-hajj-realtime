# Deployment Verification Checklist

**Date:** 2025-11-01
**Deployment:** Koyeb Production
**Backend URL:** https://api.umrah.app
**Status:** Pending Verification

---

## ✅ Step-by-Step Verification

### 1. Check Koyeb Deployment Logs

**Where:** Koyeb Dashboard → Your Service → Logs

**What to Look For:**

✅ **SUCCESS - You should see these exact lines:**
```
✅ HTTP authentication running in SUPABASE mode
✅ HTTP JWKS initialized with URI: https://qtrgbxuvjlblgkolgvxx.supabase.co/rest/v1/auth/jwks
```

❌ **FAILURE - If you see this:**
```
❌ HTTP authentication running in MOCK mode
```
**Fix:** Check that `AUTH_MODE=supabase` in Koyeb environment variables

---

### 2. Verify Environment Variables in Koyeb

**Where:** Koyeb Dashboard → Settings → Environment Variables

**Required Variables:**

- [x] `AUTH_MODE=supabase`
- [x] `NODE_ENV=production`
- [x] `PORT=8000`
- [x] `SUPABASE_URL=https://qtrgbxuvjlblgkolgvxx.supabase.co`
- [x] `SUPABASE_ANON_KEY=eyJhbGci...` (starts with eyJ)
- [x] `SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...` (starts with eyJ)
- [x] `SUPABASE_JWT_SECRET=MW5iHdtryL3qg1awPgXHcz0oPpdWyGNrmsABY9wnfmJdOgS2kQKSqUdbZVmLIWttNx8vIuLLv4IGWCEn7ys9KA==`
- [x] `DATABASE_URL=postgresql://...` (Neon database)
- [x] `ALLOWED_ORIGINS=...` (includes your frontend URLs)
- [x] `WS_ORIGIN=https://umrah-hajj-realtime.koyeb.app`

---

### 3. Test Public Endpoints (No Auth Required)

#### Test 1: Health Check
```bash
curl https://api.umrah.app/health
```
**Expected Response:**
```json
{"status": "ok"}
```

#### Test 2: Quran Surahs List
```bash
curl https://api.umrah.app/content/quran/surahs
```
**Expected Response:**
```json
[
  {"number": 1, "name": "الفاتحة", "englishName": "Al-Fatihah", ...},
  {"number": 2, "name": "البقرة", "englishName": "Al-Baqarah", ...},
  ...
]
```

#### Test 3: Specific Surah
```bash
curl https://api.umrah.app/content/quran/surah/1
```
**Expected Response:**
```json
{
  "number": 1,
  "name": "الفاتحة",
  "ayahs": [...]
}
```

---

### 4. Test Protected Endpoints (Auth Required)

#### Test 4: Mock Token Should Be REJECTED

```bash
curl -X POST https://api.umrah.app/ai/voice/token \
  -H "Authorization: Bearer dummy-jwt-user123" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'
```

**Expected Response (REJECTION):**
```json
{"statusCode": 401, "message": "Unauthorized"}
```

✅ **If you get 401:** Supabase mode is working! Mock tokens are rejected.
❌ **If you get 200 with token:** Still in mock mode - check AUTH_MODE

#### Test 5: Missing Token Should Be REJECTED

```bash
curl -X POST https://api.umrah.app/ai/voice/token \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'
```

**Expected Response:**
```json
{"statusCode": 401, "message": "Unauthorized"}
```

---

### 5. Test with Real Supabase JWT (Optional)

To fully verify Supabase integration, you need a real JWT token.

#### Option A: Use Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/qtrgbxuvjlblgkolgvxx/auth/users
2. Click "Add User" → Create test user
3. Copy the JWT token from the user details

#### Option B: Use Frontend Code (Temporary Test)
```javascript
// In browser console
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qtrgbxuvjlblgkolgvxx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmdieHV2amxibGdrb2xndnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkxMzksImV4cCI6MjA3NzU5NTEzOX0.MZTqMkE9TcerxmmAhJ_irL-v_YsXrp8B26alMGpWQi4'
);

// Register test user
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
});

console.log('JWT Token:', data.session.access_token);
```

#### Test with Real JWT
```bash
# Replace <REAL_JWT_TOKEN> with token from above
curl -X POST https://api.umrah.app/ai/voice/token \
  -H "Authorization: Bearer <REAL_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'
```

**Expected Response (SUCCESS):**
```json
{
  "token": "eyJhbGci...",
  "expiresAt": 1730889600,
  "ttl": 60,
  "scope": ["realtime.voice"],
  "language": "ar",
  "gender": "male"
}
```

✅ **If you get 200 + token:** Perfect! Supabase authentication fully working!

---

### 6. Check Service Health

**Where:** Koyeb Dashboard → Your Service → Overview

**What to Check:**

- [x] Service Status: **Running** (green)
- [x] Health Check: **Passing**
- [x] Deployment: **Latest version**
- [x] No error logs in recent activity

---

## 📋 Verification Summary

Mark each item as you verify:

### Backend Deployment
- [ ] Service is running in Koyeb
- [ ] No errors in deployment logs
- [ ] Supabase mode is active (logs show "SUPABASE mode")
- [ ] All environment variables are set correctly

### Public Endpoints
- [ ] `/health` returns 200 OK
- [ ] `/content/quran/surahs` returns surah list
- [ ] `/content/quran/surah/1` returns surah data

### Authentication
- [ ] Mock tokens are rejected (401 Unauthorized)
- [ ] Missing tokens are rejected (401 Unauthorized)
- [ ] Real Supabase JWT tokens work (200 OK + token)

### Ready for Frontend
- [ ] Unity integration guide created
- [ ] Frontend team has access to documentation
- [ ] Supabase credentials shared with frontend team
- [ ] Test user account created in Supabase

---

## 🎯 Final Checklist

**Backend Status:**
- [ ] ✅ Supabase production mode enabled
- [ ] ✅ Mock authentication disabled
- [ ] ✅ JWT validation working
- [ ] ✅ All endpoints responding correctly
- [ ] ✅ CORS configured for Unity mobile app
- [ ] ✅ WebSocket authentication enabled

**Documentation Status:**
- [x] ✅ Unity integration guide created (`UNITY_AUTH_INTEGRATION_GUIDE.md`)
- [x] ✅ Supabase setup guide available (`SUPABASE_PRODUCTION_SETUP.md`)
- [x] ✅ Koyeb env vars documented (`KOYEB_SUPABASE_ENV_VARS.md`)
- [x] ✅ API documentation available (`QURAN_API_DOCUMENTATION.md`, `AI_USAGE_DOCUMENTATION.md`)

**Frontend Team Ready:**
- [ ] ✅ Frontend team has Unity integration guide
- [ ] ✅ Frontend team has Supabase credentials (ANON_KEY only)
- [ ] ✅ Frontend team knows auth flow
- [ ] ✅ Test user account created for testing

---

## 🆘 Troubleshooting

### If verification fails, check:

1. **Koyeb Logs** - Most errors show here
2. **Environment Variables** - Typos or missing values
3. **Service Status** - Is it actually running?
4. **DNS/SSL** - Can you reach `https://api.umrah.app`?

### Common Issues:

| Issue | Cause | Fix |
|-------|-------|-----|
| Still in mock mode | `AUTH_MODE` not set | Set `AUTH_MODE=supabase` and redeploy |
| 500 errors | Missing Supabase credentials | Add all 4 Supabase env vars |
| CORS errors (web testing) | Missing origins | Add frontend URL to `ALLOWED_ORIGINS` |
| JWT validation fails | Wrong JWT secret | Verify `SUPABASE_JWT_SECRET` matches dashboard |

---

**Created:** 2025-11-01
**Last Updated:** 2025-11-01
**Status:** Ready for Verification
