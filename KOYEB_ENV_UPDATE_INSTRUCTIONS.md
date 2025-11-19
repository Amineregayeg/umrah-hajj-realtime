# Koyeb Environment Variable Update Instructions

## Required Change for gpt-realtime Model

### Current Configuration (INCORRECT)
```json
{
  "key": "REALTIME_MODEL",
  "value": "gpt-4o-realtime-preview-2024-10-01"
}
```

### Required Configuration (CORRECT)
```json
{
  "key": "REALTIME_MODEL",
  "value": "gpt-realtime"
}
```

---

## How to Update on Koyeb Dashboard

### Step 1: Navigate to Service Settings
1. Go to https://app.koyeb.com
2. Select service: `umrah-hajj-realtime`
3. Click **Settings** tab
4. Click **Environment Variables** section

### Step 2: Update the Variable
1. Find `REALTIME_MODEL` in the list
2. Click **Edit** (pencil icon)
3. Change value from `gpt-4o-realtime-preview-2024-10-01` to `gpt-realtime`
4. Click **Save**

### Step 3: Redeploy
1. Click **Deploy** button at top right
2. Wait for deployment to complete (~2-3 minutes)
3. Verify health check passes

---

## Verification After Update

### Check Logs
```bash
# Look for this line in Koyeb logs:
"Creating AI Realtime session" with model: gpt-realtime
```

### Test Endpoint
```bash
curl -X POST https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/ai/realtime/session \
  -H "Content-Type: application/json" \
  -d '{"language": "en", "gender": "male", "ritualType": "umrah"}'
```

**Expected Response:**
```json
{
  "sessionId": "sess_abc123...",
  "websocketUrl": "wss://api.openai.com/v1/realtime?model=gpt-realtime",
  "ephemeralToken": "eph_sk_...",
  "expiresAt": 1234567890,
  "voice": "verse",
  "language": "en"
}
```

---

## Complete Environment Variable Reference

### AI Feature Flags (Already Correct ✅)
```json
{
  "key": "FEATURE_AI_ENABLED",
  "value": "true"
},
{
  "key": "FEATURE_AI_REALTIME_ENABLED",
  "value": "true"
},
{
  "key": "FEATURE_AI_ROLLOUT_PERCENTAGE",
  "value": "100"
}
```

### OpenAI Configuration
```json
{
  "key": "OPENAI_API_KEY",
  "value": "<YOUR_OPENAI_API_KEY>"
},
{
  "key": "REALTIME_MODEL",
  "value": "gpt-realtime"  ← UPDATE THIS
},
{
  "key": "REALTIME_VOICE",
  "value": "verse"
}
```

---

## Alternative: Update via Koyeb CLI

```bash
# Install Koyeb CLI
curl -fsSL https://koyeb.com/install | bash

# Login
koyeb login

# Update environment variable
koyeb service update umrah-hajj-realtime \
  --env REALTIME_MODEL=gpt-realtime

# Verify
koyeb service get umrah-hajj-realtime
```

---

## Alternative: Update via GitHub (if using CI/CD)

If your deployment is automated from GitHub:

1. Update `github.txt` or your deployment config file
2. Change `REALTIME_MODEL` value to `gpt-realtime`
3. Commit and push to `deploy/koyeb-setup` branch
4. Koyeb will auto-deploy

---

## Rollback Instructions (If Issues Occur)

If you encounter problems with `gpt-realtime`:

```bash
# Rollback to previous model
koyeb service update umrah-hajj-realtime \
  --env REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
```

Or via dashboard:
1. Edit `REALTIME_MODEL`
2. Set to `gpt-4o-realtime-preview-2024-12-17`
3. Redeploy

---

## Status: ⏳ Pending Manual Update

**Action Required:** Update `REALTIME_MODEL` on Koyeb dashboard

**Estimated Time:** 2 minutes + 2-3 minutes deployment

**Priority:** P0 - Critical for Unity AI integration

**Last Updated:** 2025-11-19
