# Authentication Quick Start Guide

**5-Minute Setup Guide for Developers**

---

## 🚀 Development Setup (Mock Auth)

### Step 1: Environment Configuration (30 seconds)

Create `.env` file in `apps/backend/`:

```bash
# Authentication
AUTH_MODE=mock
NODE_ENV=development

# Server
PORT=3001

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
WS_ORIGIN=http://localhost:3000
```

### Step 2: Start Server (1 minute)

```bash
cd apps/backend
pnpm install
pnpm run start:dev
```

Look for: `"Authentication mode: mock"` in console output ✅

### Step 3: Test Authentication (30 seconds)

```bash
# Test voice token endpoint with mock auth
curl -X POST http://localhost:3001/ai/voice/token \
  -H "Authorization: Bearer dummy-jwt-yourname" \
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

✅ **Done!** Authentication is working.

---

## 📱 Frontend Integration (2 minutes)

### JavaScript/TypeScript

```javascript
// 1. Mock authentication (development)
const mockUserId = 'user123';
const mockToken = `dummy-jwt-${mockUserId}`;

// 2. Call protected endpoint
const response = await fetch('http://localhost:3001/ai/voice/token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${mockToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    language: 'ar',
    gender: 'male'
  })
});

const data = await response.json();
console.log('Voice token:', data.token);
```

### React Hook

```typescript
// useVoiceToken.ts
import { useState, useCallback } from 'react';

export function useVoiceToken() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getVoiceToken = useCallback(async (
    language: string,
    gender: 'male' | 'female' | 'neutral'
  ) => {
    setLoading(true);
    setError(null);

    try {
      // In development, use mock token
      const isDev = process.env.NODE_ENV === 'development';
      const token = isDev
        ? 'dummy-jwt-user123'
        : await getSupabaseToken(); // Your Supabase auth

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/ai/voice/token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ language, gender })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.token;

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getVoiceToken, loading, error };
}
```

### Usage in Component

```typescript
function VoiceChat() {
  const { getVoiceToken, loading, error } = useVoiceToken();

  const startVoiceSession = async () => {
    try {
      const token = await getVoiceToken('ar', 'male');
      console.log('Got voice token:', token);

      // Use token with AI voice service
      connectToVoiceAI(token);

    } catch (err) {
      console.error('Failed to get voice token:', err);
    }
  };

  return (
    <button onClick={startVoiceSession} disabled={loading}>
      {loading ? 'Connecting...' : 'Start Voice Chat'}
    </button>
  );
}
```

---

## 🌐 Production Setup (Supabase)

### Step 1: Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Create/select your project
3. Get from **Settings → API**:
   - Project URL
   - Anon key
   - Service role key
4. Get from **Settings → API → JWT Settings**:
   - JWT Secret

### Step 2: Configure Production Environment

In Koyeb/production, set these variables:

```bash
AUTH_MODE=supabase
NODE_ENV=production

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase

JWT_SECRET=your-unique-secret-for-voice-tokens
ALLOWED_ORIGINS=https://your-app.com,https://your-frontend.netlify.app
```

### Step 3: Update Frontend for Production

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Get authenticated token
export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  return session.access_token;
}
```

```typescript
// Use in API calls
const token = await getAuthToken();

const response = await fetch(`${API_URL}/ai/voice/token`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ language: 'ar', gender: 'male' })
});
```

---

## 🔍 Testing & Debugging

### Check Authentication Mode

```bash
# View logs to confirm mode
curl http://localhost:3001/health

# Check server startup logs for:
# "Authentication mode: mock" or "Authentication mode: supabase"
```

### Test Rate Limiting

```bash
# Send 6 requests rapidly (limit is 5/minute)
for i in {1..6}; do
  curl -X POST http://localhost:3001/ai/voice/token \
    -H "Authorization: Bearer dummy-jwt-test" \
    -H "Content-Type: application/json" \
    -d '{"language":"ar","gender":"male"}'
  echo "\n=== Request $i ==="
done

# Expected: First 5 succeed, 6th returns 429
```

### Debug CORS Issues

```bash
# Test with Origin header
curl -i http://localhost:3001/health \
  -H "Origin: http://localhost:3000" | grep -i access-control

# Expected:
# access-control-allow-origin: http://localhost:3000
```

### View Audit Logs

```bash
# Authentication events are logged to console
# Look for:
# - "voice_token_created" (successful token generation)
# - "voice_token_creation_failed" (errors)
```

---

## 📚 Common Patterns

### Pattern 1: WebSocket with Authentication

```javascript
// Mock mode
const mockToken = 'dummy-jwt-user123';
const ws = new WebSocket(
  `ws://localhost:3001?token=${mockToken}`
);

ws.onopen = () => console.log('Connected!');
ws.onmessage = (event) => console.log('Message:', event.data);

// Production (Supabase)
const realToken = await getSupabaseToken();
const ws = new WebSocket(
  `wss://your-api.com?token=${realToken}`
);
```

### Pattern 2: Retry with Exponential Backoff

```typescript
async function getVoiceTokenWithRetry(
  language: string,
  gender: string,
  maxRetries = 3
): Promise<string> {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/ai/voice/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language, gender })
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.token;

    } catch (err) {
      lastError = err;
      if (i === maxRetries - 1) throw err;
    }
  }

  throw lastError;
}
```

### Pattern 3: Token Caching

```typescript
class VoiceTokenManager {
  private token: string | null = null;
  private expiresAt: number = 0;

  async getToken(language: string, gender: string): Promise<string> {
    // Return cached token if still valid
    if (this.token && Date.now() < this.expiresAt - 5000) {
      return this.token;
    }

    // Fetch new token
    const authToken = await getAuthToken();
    const response = await fetch(`${API_URL}/ai/voice/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ language, gender })
    });

    const data = await response.json();
    this.token = data.token;
    this.expiresAt = data.expiresAt * 1000; // Convert to ms

    return this.token;
  }

  invalidate() {
    this.token = null;
    this.expiresAt = 0;
  }
}

export const voiceTokenManager = new VoiceTokenManager();
```

---

## ❓ FAQ

### Q: How do I switch between mock and production auth?

**A:** Change `AUTH_MODE` environment variable:
- Development: `AUTH_MODE=mock`
- Production: `AUTH_MODE=supabase`

Restart server for changes to take effect.

### Q: What's the difference between mock and Supabase tokens?

**A:**
- **Mock:** `Bearer dummy-jwt-{userId}` - Simple format for testing
- **Supabase:** `Bearer eyJhbG...` - Real JWT with RS256 signature

Mock mode extracts user ID from token format. Supabase mode validates signature and claims.

### Q: How do I test rate limiting?

**A:** Send 6+ requests within 60 seconds. The 6th request will return 429 (rate limit exceeded).

### Q: Can I use mock auth in production?

**A:** ❌ **NO** - Mock auth should NEVER be used in production. It has no security.

### Q: How long are voice tokens valid?

**A:** Maximum 60 seconds. Tokens expire quickly for security.

### Q: What happens if my Supabase JWT expires?

**A:** You'll get a 401 error. Refresh the JWT using Supabase's `refreshSession()` method.

### Q: How many requests can I make per minute?

**A:**
- Voice token: 5 requests/minute (burst: 10)
- Navigation snapshot: 1 request/minute

### Q: Where are authentication errors logged?

**A:**
- Development: Console output
- Production: Koyeb dashboard → Logs
- All events include timestamp, user ID, and event type

---

## 🆘 Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid token | Check Authorization header format |
| 429 Too Many Requests | Rate limit exceeded | Wait 60 seconds or implement retry logic |
| 403 Forbidden | Wrong permissions | Check token scope/claims |
| 500 Internal Server Error | Server misconfiguration | Check server logs, verify env vars |
| CORS error | Origin not allowed | Add origin to ALLOWED_ORIGINS |

---

## 📖 Next Steps

1. **Read full documentation:** [README.md](./README.md)
2. **Review security docs:** [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md)
3. **Check API docs:** http://localhost:3001/docs
4. **Run tests:** `pnpm test src/auth`

---

**Need Help?**
- GitHub Issues: https://github.com/Amineregayeg/umrah-hajj-realtime/issues
- Team: @auth-team
- Docs: [docs/authentication/](./README.md)
