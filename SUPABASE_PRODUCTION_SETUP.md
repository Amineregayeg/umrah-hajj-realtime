# Supabase Production Setup Guide

**Project Reference:** `qtrgbxuvjlblgkolgvxx`
**Project URL:** `https://qtrgbxuvjlblgkolgvxx.supabase.co`
**Status:** ✅ Project Active and Responding
**MCP Integration:** ✅ Connected and Authenticated

---

## ✅ Progress Summary

| Credential | Status | Location |
|------------|--------|----------|
| Project URL | ✅ Retrieved via MCP | Added to `.env` |
| Anon/Public Key | ✅ Retrieved via MCP | Added to `.env` |
| Service Role Key | ⏳ **Needs Manual Retrieval** | Dashboard only |
| JWT Secret | ⏳ **Needs Manual Retrieval** | Dashboard only |

---

## 🔑 Step 1: Get Remaining Credentials (2 Required)

For security reasons, the **Service Role Key** and **JWT Secret** cannot be retrieved via MCP.
You must get them from the Supabase dashboard:

### Navigate to Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/qtrgbxuvjlblgkolgvxx
2. Click on **Settings** (gear icon in sidebar)
3. Click on **API**

### Credential 1: Service Role Key

Scroll to **Project API keys** section:

Find the key labeled **"service_role"** with type "secret"

```
Example format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
⚠️ This is a SECRET key - Never expose in frontend code!
```

**Copy the entire Service Role key**

### Credential 2: JWT Secret

Scroll down to **JWT Settings** section:

Find **"JWT Secret"**

```
Example format: a long random string of characters
⚠️ This is a SECRET - Never commit to git!
```

**Copy the JWT Secret value**

---

## 📝 Step 2: Update Backend Configuration

### Current `.env` Status:

✅ **Already Updated:**
```bash
SUPABASE_URL="https://qtrgbxuvjlblgkolgvxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmdieHV2amxibGdrb2xndnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkxMzksImV4cCI6MjA3NzU5NTEzOX0.MZTqMkE9TcerxmmAhJ_irL-v_YsXrp8B26alMGpWQi4"
```

⏳ **Needs Your Input:**
```bash
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"  # ← Replace with value from dashboard
SUPABASE_JWT_SECRET="YOUR_JWT_SECRET_HERE"              # ← Replace with value from dashboard
```

### How to Update:

**Option A: Edit manually**
1. Open `apps/backend/.env`
2. Replace the placeholder values
3. Save the file

**Option B: Paste values here**
Just paste the values in chat:
```
Service Role Key: [paste here]
JWT Secret: [paste here]
```

And I'll update the file for you.

### Enable Supabase Mode

After adding the credentials, change this line in `.env`:
```bash
# Change from:
AUTH_MODE=mock

# To:
AUTH_MODE=supabase
```

---

## 🚀 Step 3: Update Koyeb Environment Variables

Once local `.env` is configured, update Koyeb for production:

### Access Koyeb Dashboard

1. Go to: https://app.koyeb.com
2. Find your service: `umrah-hajj-realtime`
3. Click **Settings** → **Environment Variables**

### Add/Update These Variables:

```bash
# Authentication Mode
AUTH_MODE=supabase

# Supabase Configuration
SUPABASE_URL=https://qtrgbxuvjlblgkolgvxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmdieHV2amxibGdrb2xndnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkxMzksImV4cCI6MjA3NzU5NTEzOX0.MZTqMkE9TcerxmmAhJ_irL-v_YsXrp8B26alMGpWQi4
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-from-dashboard>
SUPABASE_JWT_SECRET=<paste-jwt-secret-from-dashboard>
```

### Deploy Changes

Click **Update Service** to trigger redeploy with new environment variables.

---

## ✅ Step 4: Verify Setup

### Check Backend Logs

After Koyeb deploys, check logs for these success messages:

```
✅ Expected in logs:
HTTP authentication running in SUPABASE mode
HTTP JWKS initialized with URI: https://qtrgbxuvjlblgkolgvxx.supabase.co/rest/v1/auth/jwks
```

```
❌ If you see this, AUTH_MODE is still 'mock':
HTTP authentication running in MOCK mode
```

### Test with Real JWT Token

1. **Get a test JWT from Supabase:**

```javascript
// In browser console at your frontend
const { data } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
});
console.log('JWT Token:', data.session.access_token);
```

2. **Test backend authentication:**

```bash
# Replace <TOKEN> with the JWT from step 1
curl -X POST https://api.umrah.app/ai/voice/token \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}'
```

**Expected Response:**
```json
{
  "token": "eyJhbGci...",
  "expiresAt": 1234567890,
  "ttl": 60,
  "scope": ["realtime.voice"],
  "language": "ar",
  "gender": "male"
}
```

---

## 🔐 Security Checklist

- [ ] Service Role Key added to Koyeb (not committed to git)
- [ ] JWT Secret added to Koyeb (not committed to git)
- [ ] `.env` file is in `.gitignore`
- [ ] `AUTH_MODE=supabase` in Koyeb (not 'mock')
- [ ] Anon Key is the only key used in frontend
- [ ] Enable Row Level Security (RLS) on all Supabase tables
- [ ] Configure email templates in Supabase Auth settings
- [ ] Set up SMTP provider for production emails

---

## 📚 Next Steps

### 1. Enable Email Authentication in Supabase

1. Go to: https://supabase.com/dashboard/project/qtrgbxuvjlblgkolgvxx/auth/providers
2. **Email** provider should already be enabled (it's default)
3. Configure email templates:
   - Confirmation email
   - Password reset email
   - Magic link email
4. Set up SMTP provider for production emails (optional, Supabase provides default)

### 2. Configure Frontend

```bash
# Install Supabase client
npm install @supabase/supabase-js
```

```javascript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://qtrgbxuvjlblgkolgvxx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmdieHV2amxibGdrb2xndnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkxMzksImV4cCI6MjA3NzU5NTEzOX0.MZTqMkE9TcerxmmAhJ_irL-v_YsXrp8B26alMGpWQi4'
);
```

```javascript
// Signup example
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123'
});

if (error) {
  console.error('Signup failed:', error.message);
} else {
  console.log('User signed up:', data.user);
  console.log('JWT Token:', data.session.access_token);
}
```

```javascript
// Login example
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123'
});

if (error) {
  console.error('Login failed:', error.message);
} else {
  console.log('User logged in:', data.user);
  // Use this token with your backend
  const token = data.session.access_token;
}
```

### 3. Use JWT Token with Your Backend

```javascript
// After login, use the JWT token
const token = data.session.access_token;

// Call protected endpoints
const response = await fetch('https://api.umrah.app/ai/voice/token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    language: 'ar',
    gender: 'male'
  })
});

const voiceToken = await response.json();
console.log('Voice token:', voiceToken);
```

### 4. Complete Authentication Flow

```
1. User signs up → Supabase Auth
   ↓
2. Supabase returns JWT token
   ↓
3. Frontend stores token (localStorage/sessionStorage)
   ↓
4. Frontend calls YOUR backend with JWT
   ↓
5. Backend validates JWT (checks signature via JWKS)
   ↓
6. Backend grants access to protected endpoints
```

---

## 🆘 Troubleshooting

### Issue: "No API key found in request"
**Cause:** Missing anon key in Supabase request
**Fix:** Supabase client should automatically include the anon key. Check initialization.

### Issue: "Invalid JWT" from your backend
**Cause:** JWT Secret mismatch or token expired
**Fix:**
1. Verify `SUPABASE_JWT_SECRET` in Koyeb matches dashboard
2. Check token hasn't expired
3. Ensure `AUTH_MODE=supabase` (not 'mock')

### Issue: Backend still in mock mode
**Cause:** `AUTH_MODE` not set to 'supabase'
**Fix:** Update Koyeb env var `AUTH_MODE=supabase` and redeploy

### Issue: "User not found" errors
**Cause:** User hasn't confirmed email
**Fix:** Check Supabase dashboard → Authentication → Users for email confirmation status

### Issue: CORS errors in frontend
**Cause:** Backend not allowing frontend origin
**Fix:** Add your frontend URL to `ALLOWED_ORIGINS` in Koyeb:
```bash
ALLOWED_ORIGINS=https://your-frontend.netlify.app,https://your-app.com
```

---

## 📖 Documentation Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/qtrgbxuvjlblgkolgvxx
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **Supabase JS Client:** https://supabase.com/docs/reference/javascript/auth-signup
- **Your Auth Documentation:** `docs/authentication/README.md`
- **Your API Documentation:** `QURAN_API_DOCUMENTATION.md`, `AI_USAGE_DOCUMENTATION.md`

---

## 📊 Summary

### What's Done ✅
- [x] Supabase project created (qtrgbxuvjlblgkolgvxx)
- [x] MCP server connected and authenticated
- [x] Project URL retrieved
- [x] Anon key retrieved
- [x] Backend `.env` updated with URL and anon key

### What's Needed ⏳
- [ ] Get Service Role Key from dashboard
- [ ] Get JWT Secret from dashboard
- [ ] Update `.env` with missing credentials
- [ ] Change `AUTH_MODE=supabase` in `.env`
- [ ] Update Koyeb environment variables
- [ ] Test authentication with real JWT
- [ ] Configure frontend with Supabase client

---

**Created:** 2025-11-01
**Last Updated:** 2025-11-01
**Project:** Umrah Hajj Realtime
**Status:** ⏳ Waiting for Service Role Key & JWT Secret
