# AI Guide Usage Documentation

**For Developers, QA Teams & Product Managers**

**API Base URL:** `https://api.umrah.app` (Production) | `http://localhost:3000` (Development)

**Last Updated:** October 29, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Feature Flags](#feature-flags)
4. [API Endpoints](#api-endpoints)
5. [WebSocket Integration](#websocket-integration)
6. [Voice Commands](#voice-commands)
7. [Testing Guide](#testing-guide)
8. [Enabling AI Features](#enabling-ai-features)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The AI Guide system provides intelligent, voice-enabled Islamic guidance for Umrah and Hajj pilgrims using OpenAI's GPT-4 Realtime API.

### Key Features

- **Voice Chat:** Real-time voice conversations in Arabic, English, and French
- **Islamic Guidance:** Umrah/Hajj steps, duas, madhhab differences
- **Navigation Integration:** Context-aware prompts based on user location
- **Voice Commands:** Hands-free navigation control
- **Ritual Tracking:** Automatic Tawaf/Sa'i lap counting
- **Multi-language:** Automatic language detection and switching

### Architecture

```
Unity 3D Client
    ↓ (REST API)
Backend API (NestJS)
    ↓ (WebSocket)
OpenAI Realtime API
    ↓ (Voice I/O)
User (Pilgrim)
```

---

## Current Status

### Deployment Status

**✅ DEPLOYED** (October 29, 2025)

- All AI services deployed to Koyeb
- Feature flags system active
- All features **DISABLED by default** (zero-risk deployment)

### What's Ready

- ✅ 8 AI Services (implemented and deployed)
- ✅ WebSocket Gateway (ready for connections)
- ✅ Feature Flag System (tested and working)
- ✅ Knowledge Base (4 Islamic guidance documents)
- ✅ Complete Quran Data (114 Surahs, 6,236 Ayahs)
- ✅ Multi-language Support (EN/FR/AR)

### What's Disabled (Waiting for QA)

- ❌ AI Voice Chat (feature flag OFF)
- ❌ AI Realtime API (feature flag OFF)
- ❌ Navigation AI Prompts (feature flag OFF)
- ❌ Voice Commands (feature flag OFF)

**To Enable:** See [Enabling AI Features](#enabling-ai-features)

---

## Feature Flags

The AI system uses feature flags for gradual rollout and instant disable capability.

### Available Flags

| Flag | Environment Variable | Default | Purpose |
|------|---------------------|---------|---------|
| **AI Enabled** | `FEATURE_AI_ENABLED` | `false` | Master AI toggle |
| **AI Realtime** | `FEATURE_AI_REALTIME_ENABLED` | `false` | Voice chat feature |
| **Navigation Prompts** | `FEATURE_AI_NAV_PROMPTS_ENABLED` | `false` | Location-based AI prompts |
| **Test Users** | `FEATURE_AI_TEST_USERS` | `""` | Comma-separated user IDs |
| **Rollout Percentage** | `FEATURE_AI_ROLLOUT_PERCENTAGE` | `0` | 0-100 (gradual rollout) |
| **Emergency Kill Switch** | `EMERGENCY_KILL_SWITCH` | `false` | Instant disable all AI |

### How Feature Flags Work

```typescript
// Check if AI is enabled for a specific user
const isEnabled = featureFlagsService.isAIEnabledForUser(userId);

// Logic:
if (EMERGENCY_KILL_SWITCH === true) return false;
if (userId in TEST_USERS) return true;
if (random(userId) < ROLLOUT_PERCENTAGE) return true;
return false;
```

### Checking Feature Flag Status

**In Logs (on deployment):**
```
=== Feature Flags Status ===
AI Enabled: false
AI Realtime Enabled: false
AI Navigation Prompts Enabled: false
Emergency Kill Switch: false
Rollout Percentage: 0%
Test Users: 0 configured
===========================
```

**Via API (monitoring):**
```bash
# Check server logs for feature flag status
curl https://api.umrah.app/health
# (Health endpoint doesn't expose flags, check deployment logs)
```

---

## API Endpoints

### 1. Create AI Realtime Session

Start a new voice chat session with the AI guide.

**Endpoint:** `POST /ai/realtime/session`

**Authentication:** Required (Supabase JWT)

**Request Headers:**
```
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "gender": "male",
  "language": "en",
  "madhhab": "hanafi",
  "location": {
    "lat": 21.4225,
    "lon": 39.8262
  },
  "ritual_state": {
    "stage": "tawaf",
    "tawafLaps": 3
  }
}
```

**Response (Success):**
```json
{
  "session_id": "sess_abc123...",
  "client_secret": {
    "value": "eph_sk_...",
    "expires_at": 1730000000
  },
  "voice": "verse",
  "model": "gpt-4o-realtime-preview-2024-12-17",
  "instructions": "You are an Islamic guide...",
  "ws_url": "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17"
}
```

**Response (Feature Disabled):**
```json
{
  "statusCode": 400,
  "message": "AI Realtime feature is not enabled",
  "error": "Bad Request",
  "code": "FEATURE_NOT_ENABLED"
}
```

**Example Request (cURL):**
```bash
curl -X POST "https://api.umrah.app/ai/realtime/session" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "language": "en",
    "madhhab": "hanafi"
  }'
```

**Example Request (JavaScript):**
```typescript
async function createAISession(authToken: string) {
  const response = await fetch('https://api.umrah.app/ai/realtime/session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gender: 'male',
      language: 'en',
      madhhab: 'hanafi',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.code === 'FEATURE_NOT_ENABLED') {
      console.log('AI feature is not enabled yet');
      return null;
    }
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return await response.json();
}
```

---

### 2. Get AI Voice Token (Deprecated - Use Realtime Session)

**Endpoint:** `POST /ai/voice/token`

**Status:** Deprecated in favor of `/ai/realtime/session`

---

## WebSocket Integration

### Connection Flow

1. **Create Session** (REST API)
   ```typescript
   const session = await createAISession(jwtToken);
   ```

2. **Connect to OpenAI WebSocket**
   ```typescript
   const ws = new WebSocket(session.ws_url);
   ws.headers = {
     'Authorization': `Bearer ${session.client_secret.value}`,
     'OpenAI-Beta': 'realtime=v1',
   };
   ```

3. **Send/Receive Events**
   ```typescript
   // Send audio from microphone
   ws.send(JSON.stringify({
     type: 'input_audio_buffer.append',
     audio: base64AudioData,
   }));

   // Receive AI responses
   ws.onmessage = (event) => {
     const data = JSON.parse(event.data);
     if (data.type === 'response.audio.delta') {
       playAudio(data.delta); // Play AI voice response
     }
   };
   ```

### WebSocket Events

**Client → Server (OpenAI):**
- `input_audio_buffer.append` - Send user's voice audio
- `input_audio_buffer.commit` - Finish audio input
- `conversation.item.create` - Send text message
- `response.create` - Request AI response

**Server → Client (OpenAI):**
- `response.audio.delta` - AI voice response chunks
- `response.audio.done` - Voice response complete
- `response.text.delta` - AI text response chunks
- `conversation.item.created` - Message added to conversation

For full WebSocket event documentation, see:
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)

---

## Voice Commands

The AI system recognizes natural language voice commands in multiple languages.

### Supported Commands

| Command (English) | Command (French) | Command (Arabic) | Action |
|------------------|------------------|------------------|--------|
| "show timeline" | "afficher la chronologie" | "أظهر الجدول الزمني" | Open timeline view |
| "show map" | "afficher la carte" | "أظهر الخريطة" | Open map view |
| "switch to Arabic" | "passer à l'arabe" | "التبديل إلى العربية" | Change language |
| "go to settings" | "aller aux paramètres" | "اذهب إلى الإعدادات" | Open settings |
| "help" | "aide" | "مساعدة" | Show help |

### Command Detection

Commands are detected using fuzzy matching:
- **Exact match:** "show timeline" → `SHOW_TIMELINE`
- **Partial match:** "timeline please" → `SHOW_TIMELINE`
- **Similar word:** "display timeline" → `SHOW_TIMELINE`

### Adding New Commands

1. **Update VoiceCommandService**
   ```typescript
   // apps/backend/src/ai/services/voice-command.service.ts
   private readonly commands = {
     SHOW_TIMELINE: {
       en: ['show timeline', 'display timeline', 'open timeline'],
       fr: ['afficher la chronologie', 'montrer la chronologie'],
       ar: ['أظهر الجدول الزمني', 'عرض الجدول الزمني'],
     },
     // Add new command here
   };
   ```

2. **Handle Command in Frontend**
   ```typescript
   ws.onmessage = (event) => {
     const data = JSON.parse(event.data);
     if (data.command_detected) {
       switch (data.command_detected) {
         case 'SHOW_TIMELINE':
           showTimelineView();
           break;
         // Handle new command
       }
     }
   };
   ```

---

## Testing Guide

### Phase 1: Feature Disabled (Current State)

**Test that AI is properly disabled:**

```bash
# Attempt to create session (should fail)
curl -X POST "https://api.umrah.app/ai/realtime/session" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected Response:
# {
#   "statusCode": 400,
#   "message": "AI Realtime feature is not enabled",
#   "error": "Bad Request",
#   "code": "FEATURE_NOT_ENABLED"
# }
```

**✅ Pass Criteria:**
- API returns 400 error
- Error message: "AI Realtime feature is not enabled"
- Existing navigation/Quran APIs still work
- No errors in server logs

---

### Phase 2: Test Users Only

**Enable AI for 2-3 test users:**

1. **Set Environment Variables (Koyeb):**
   ```bash
   FEATURE_AI_ENABLED=true
   FEATURE_AI_REALTIME_ENABLED=true
   FEATURE_AI_TEST_USERS=user_123,user_456
   FEATURE_AI_ROLLOUT_PERCENTAGE=0
   ```

2. **Test with Test User:**
   ```bash
   # Login as test user (user_123)
   # Get JWT token
   # Create session - should succeed
   ```

3. **Test with Regular User:**
   ```bash
   # Login as regular user (user_789)
   # Create session - should fail with FEATURE_NOT_ENABLED
   ```

**✅ Pass Criteria:**
- Test users can create sessions
- Regular users cannot create sessions
- No errors for non-test users
- Server logs show feature enabled for test users

---

### Phase 3: Gradual Rollout

**Enable for 10% of users:**

```bash
FEATURE_AI_ENABLED=true
FEATURE_AI_REALTIME_ENABLED=true
FEATURE_AI_TEST_USERS=
FEATURE_AI_ROLLOUT_PERCENTAGE=10
```

**Test:**
- Create 100 user accounts
- ~10 should have AI enabled
- ~90 should get FEATURE_NOT_ENABLED

---

### Phase 4: Full Production

**Enable for all users:**

```bash
FEATURE_AI_ENABLED=true
FEATURE_AI_REALTIME_ENABLED=true
FEATURE_AI_ROLLOUT_PERCENTAGE=100
```

---

### Emergency Disable

**If issues occur in production:**

```bash
EMERGENCY_KILL_SWITCH=true
```

This instantly disables all AI features for all users (takes effect within 30 seconds).

---

## Enabling AI Features

### For Development/Testing

1. **Update Backend `.env` file:**
   ```bash
   # apps/backend/.env
   FEATURE_AI_ENABLED=true
   FEATURE_AI_REALTIME_ENABLED=true
   FEATURE_AI_NAV_PROMPTS_ENABLED=false  # Keep off for now
   FEATURE_AI_TEST_USERS=your_user_id
   FEATURE_AI_ROLLOUT_PERCENTAGE=0
   EMERGENCY_KILL_SWITCH=false

   # OpenAI API Key (required)
   OPENAI_API_KEY=sk-proj-...your-key-here...
   REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
   REALTIME_VOICE=verse
   ```

2. **Restart Backend:**
   ```bash
   cd apps/backend
   pnpm dev
   ```

3. **Check Logs:**
   ```
   === Feature Flags Status ===
   AI Enabled: true
   AI Realtime Enabled: true
   AI Navigation Prompts Enabled: false
   Emergency Kill Switch: false
   Rollout Percentage: 0%
   Test Users: 1 configured
   ===========================
   ```

4. **Test API:**
   ```bash
   curl -X POST "http://localhost:3000/ai/realtime/session" \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{"language": "en"}'
   ```

---

### For Koyeb Production

1. **Go to Koyeb Dashboard** → Services → umrah-backend → Settings → Environment Variables

2. **Add/Update Variables:**
   ```
   FEATURE_AI_ENABLED=true
   FEATURE_AI_REALTIME_ENABLED=true
   FEATURE_AI_TEST_USERS=user_id_1,user_id_2
   ```

3. **Deploy** (Koyeb auto-deploys on env var change)

4. **Monitor Logs** (Koyeb → Logs tab)
   - Look for "Feature Flags Status"
   - Check for any errors

---

## Troubleshooting

### Issue 1: "AI Realtime feature is not enabled"

**Cause:** Feature flags disabled (expected behavior)

**Solution:** Enable feature flags (see [Enabling AI Features](#enabling-ai-features))

---

### Issue 2: "Invalid or expired token"

**Cause:** JWT token invalid or expired

**Solution:**
1. Check JWT token is valid Supabase token
2. Verify token not expired (check `exp` claim)
3. Re-login to get fresh token

---

### Issue 3: WebSocket Connection Fails

**Cause:** Invalid session or OpenAI API error

**Solution:**
1. Check OpenAI API key is valid
2. Verify session created successfully
3. Check `client_secret` not expired
4. Check OpenAI API status: https://status.openai.com

---

### Issue 4: No Voice Response

**Cause:** Audio not sent correctly or OpenAI error

**Solution:**
1. Check audio format (base64-encoded PCM16)
2. Verify audio buffer committed
3. Check WebSocket event logs
4. Test with text input first

---

### Issue 5: Wrong Language Response

**Cause:** Language not set correctly in session

**Solution:**
1. Pass `language` parameter in session creation
2. Use ISO codes: `en`, `fr`, `ar`
3. Check AI instructions in session response

---

## Knowledge Base

The AI has access to these Islamic guidance documents:

1. **`umrah_basics.md`** - Umrah step-by-step guidance (250 lines)
2. **`hajj_steps.md`** - Hajj ritual steps (300 lines)
3. **`madhhab_differences.md`** - Islamic school differences (200 lines)
4. **`duas_selected.md`** - Selected supplications (150 lines)

**Location:** `apps/backend/src/ai/knowledge/`

**How it works:**
- AI searches knowledge base when user asks questions
- Trigram-based fast search
- Returns most relevant snippets
- AI uses snippets to formulate response

---

## Cost Monitoring

**OpenAI Realtime API Pricing:**
- Input Audio: $0.06 / minute
- Output Audio: $0.24 / minute
- Text Tokens: Standard GPT-4 rates

**Estimated Costs:**
- 10-minute conversation: ~$3.00
- 1,000 users @ 10 min each: ~$3,000/month

**Monitoring:**
- Check OpenAI dashboard for usage
- Set billing alerts
- Use feature flags to limit rollout

---

## Security

### Authentication

- All AI endpoints require Supabase JWT authentication
- WebSocket uses OpenAI ephemeral keys (60-second expiry)
- No API keys exposed to client

### Data Privacy

- Voice data sent directly to OpenAI (not stored on backend)
- Conversation history not persisted
- User location/ritual state sent only when relevant
- GDPR compliant

### Rate Limiting

- OpenAI Realtime API has built-in rate limits
- Backend feature flags provide additional control
- Emergency kill switch for instant disable

---

## API Documentation Links

### Related Documentation

- **Quran API:** [QURAN_API_DOCUMENTATION.md](./QURAN_API_DOCUMENTATION.md)
- **Testing Guide:** [AI_GUIDE_TESTING_GUIDE.md](./AI_GUIDE_TESTING_GUIDE.md)
- **Implementation Details:** [AI_GUIDE_IMPLEMENTATION_COMPLETE.md](./AI_GUIDE_IMPLEMENTATION_COMPLETE.md)
- **Zero-Risk Strategy:** [AI_GUIDE_ZERO_RISK_STRATEGY.md](./AI_GUIDE_ZERO_RISK_STRATEGY.md)
- **Authentication:** [docs/authentication/README.md](./docs/authentication/README.md)

### External Links

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Supabase JWT Docs](https://supabase.com/docs/guides/auth/jwt)

---

## Quick Reference

### Feature Flags (Environment Variables)

```bash
# Enable AI for test users only (SAFE)
FEATURE_AI_ENABLED=true
FEATURE_AI_REALTIME_ENABLED=true
FEATURE_AI_TEST_USERS=user_123,user_456
FEATURE_AI_ROLLOUT_PERCENTAGE=0

# Enable AI for 10% of users (GRADUAL)
FEATURE_AI_ROLLOUT_PERCENTAGE=10

# Enable AI for all users (FULL ROLLOUT)
FEATURE_AI_ROLLOUT_PERCENTAGE=100

# Emergency disable (INSTANT OFF)
EMERGENCY_KILL_SWITCH=true
```

### API Endpoints

```bash
# Create AI session
POST /ai/realtime/session
Headers: Authorization: Bearer JWT_TOKEN

# Response:
# - session_id
# - client_secret
# - ws_url
```

### WebSocket Connection

```javascript
const ws = new WebSocket(session.ws_url);
ws.headers = {
  'Authorization': `Bearer ${session.client_secret.value}`,
  'OpenAI-Beta': 'realtime=v1',
};
```

---

## Support

**For Questions:**
- Technical: Contact backend development team
- Testing: See [AI_GUIDE_TESTING_GUIDE.md](./AI_GUIDE_TESTING_GUIDE.md)
- Production Issues: Check [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md)

**For Bugs:**
- Create issue in project tracker
- Include: logs, steps to reproduce, expected vs actual behavior

---

## Changelog

### October 29, 2025
- ✅ Deployed to production (all features disabled)
- ✅ Feature flags system active
- ✅ 8 AI services ready
- ✅ WebSocket gateway ready
- ⏳ Waiting for QA testing approval

### October 28, 2025
- ✅ Initial implementation complete
- ✅ Pushed to git (branch: `deploy/koyeb-setup`)
- ✅ Documentation created

---

**Live API:** https://api.umrah.app/ai/

**Status:** Deployed, feature flags OFF (waiting for QA approval)

**Next Steps:** Enable for test users → QA testing → Gradual rollout
