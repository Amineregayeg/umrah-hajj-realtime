# WebSocket Testing Tokens Guide

**For Developers & QA Teams**

**Last Updated:** October 29, 2025

---

## Quick Answer

**YES** - There are mock tokens for testing! The backend supports **2 authentication modes:**

1. **Mock Mode** (Development) - Uses simple dummy tokens
2. **Supabase Mode** (Production) - Uses real JWT tokens

---

## 🧪 Development/Testing (Mock Tokens)

### Mock Token Format

**Pattern:** `dummy-jwt-{userId}`

**Examples:**
```
dummy-jwt-user123
dummy-jwt-testuser
dummy-jwt-alice
dummy-jwt-bob
dummy-jwt-myname
```

The `{userId}` part can be **anything you want** - it becomes your user ID in the backend.

---

### How to Use Mock Tokens

#### 1. WebSocket Connection

```javascript
// JavaScript
const mockToken = "dummy-jwt-user123";
const ws = new WebSocket(`ws://localhost:3000?token=${mockToken}`);
```

```csharp
// Unity C#
string mockToken = "dummy-jwt-testuser";
string wsUrl = $"ws://localhost:3000?token={mockToken}";
WebSocket ws = new WebSocket(wsUrl);
ws.Connect();
```

```dart
// Flutter
final mockToken = "dummy-jwt-alice";
final wsUrl = Uri.parse('ws://localhost:3000?token=$mockToken');
final channel = WebSocketChannel.connect(wsUrl);
```

---

#### 2. REST API Endpoints

```bash
# cURL
curl -X GET "http://localhost:3000/profile" \
  -H "Authorization: Bearer dummy-jwt-user123"

# The backend will recognize you as user "user123"
```

```javascript
// JavaScript/TypeScript
const mockToken = "dummy-jwt-user123";

const response = await fetch('http://localhost:3000/profile', {
  headers: {
    'Authorization': `Bearer ${mockToken}`
  }
});
```

---

### When Mock Mode is Active

Mock mode is **automatically enabled** when:

1. **`AUTH_MODE=mock`** environment variable is set, OR
2. **`NODE_ENV=development`** and `AUTH_MODE` is not set to `supabase`

**Check if mock mode is active:**
- Look for this log on server startup:
  ```
  [SupabaseJwtGuard] HTTP authentication running in MOCK mode
  ```

---

## 🔐 Production (Real JWT Tokens)

### Production Authentication

Production uses **Supabase JWT tokens** - these are real, cryptographically signed tokens.

**⚠️ Mock tokens do NOT work in production!**

---

### Option 1: Get Token via Mock Login Endpoint (Temporary)

**⚠️ Note:** This endpoint may not exist in production or may be disabled for security.

```bash
curl -X POST "https://api.umrah.app/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"username": "test@example.com"}'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

### Option 2: Get Token via Supabase Authentication

This is the **proper production method**.

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

if (data.session) {
  const jwtToken = data.session.access_token;

  // Use this token for WebSocket
  const ws = new WebSocket(`wss://api.umrah.app?token=${jwtToken}`);
}
```

---

## 📋 Complete Testing Examples

### Example 1: Test Navigation WebSocket (Mock Mode)

```bash
# Step 1: Install wscat
npm install -g wscat

# Step 2: Connect with mock token
wscat -c "ws://localhost:3000?token=dummy-jwt-testuser"

# Step 3: Wait for welcome message
# You should see:
# < {"event":"connection_status","data":{"status":"connected","authenticated":true,"userId":"testuser",...}}

# Step 4: Send a GPS update
> {"event":"nav.update","data":{"lat":21.4225,"lon":39.8262,"heading":270,"speed":1.5,"ts":1698765432000,"seq":1001}}

# Step 5: Should receive success
# < {"event":"success","data":{"success":true,"operation":"nav.update"}}
```

---

### Example 2: Test with JavaScript (Mock Mode)

```javascript
// test-websocket.js
const WebSocket = require('ws');

const mockToken = "dummy-jwt-testuser";
const ws = new WebSocket(`ws://localhost:3000?token=${mockToken}`);

ws.on('open', () => {
  console.log('✅ Connected');

  // Send GPS update
  ws.send(JSON.stringify({
    event: 'nav.update',
    data: {
      lat: 21.4225,
      lon: 39.8262,
      heading: 270,
      speed: 1.5,
      ts: Date.now(),
      seq: Date.now()
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('📨 Received:', message);

  if (message.event === 'connection_status') {
    console.log('✅ Authenticated as user:', message.data.userId);
  }
});

ws.on('error', (error) => {
  console.error('❌ Error:', error);
});

ws.on('close', () => {
  console.log('🔌 Disconnected');
});
```

**Run it:**
```bash
node test-websocket.js
```

---

### Example 3: Test with Unity (Mock Mode)

```csharp
using UnityEngine;
using WebSocketSharp;
using Newtonsoft.Json;

public class WebSocketTester : MonoBehaviour
{
    private WebSocket ws;

    void Start()
    {
        TestWebSocket();
    }

    void TestWebSocket()
    {
        // Mock token for development
        string mockToken = "dummy-jwt-unitytest";
        string wsUrl = $"ws://localhost:3000?token={mockToken}";

        ws = new WebSocket(wsUrl);

        ws.OnOpen += (sender, e) => {
            Debug.Log("✅ WebSocket connected");

            // Send GPS update
            var message = new {
                @event = "nav.update",
                data = new {
                    lat = 21.4225,
                    lon = 39.8262,
                    heading = 270,
                    speed = 1.5,
                    ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    seq = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                }
            };

            ws.Send(JsonConvert.SerializeObject(message));
        };

        ws.OnMessage += (sender, e) => {
            Debug.Log($"📨 Received: {e.Data}");

            var message = JsonConvert.DeserializeObject<dynamic>(e.Data);
            if (message.@event == "connection_status")
            {
                Debug.Log($"✅ Authenticated as user: {message.data.userId}");
            }
        };

        ws.OnError += (sender, e) => {
            Debug.LogError($"❌ WebSocket error: {e.Message}");
        };

        ws.OnClose += (sender, e) => {
            Debug.Log("🔌 WebSocket closed");
        };

        ws.Connect();
    }

    void OnDestroy()
    {
        if (ws != null && ws.ReadyState == WebSocketState.Open)
        {
            ws.Close();
        }
    }
}
```

---

## 🔍 How Mock Mode Works

### Backend Implementation

When you send a mock token like `dummy-jwt-user123`:

1. **Backend extracts the token** from `Authorization: Bearer dummy-jwt-user123`
2. **Removes the prefix** `dummy-jwt-` → leaves `user123`
3. **Creates a mock user object:**
   ```json
   {
     "id": "user123",
     "sub": "user123",
     "email": "mock@example.com",
     "aud": "authenticated",
     "role": "authenticated",
     "exp": 1698769032,
     "iat": 1698765432
   }
   ```
4. **Allows the request** to proceed

**Log output:**
```
[SupabaseJwtGuard] Mock mode: Authentication bypassed for user user123
```

---

## ⚠️ Production vs Development

### Development (Local)

**Environment:**
```bash
AUTH_MODE=mock
NODE_ENV=development
```

**URL:** `ws://localhost:3000`

**Token:** `dummy-jwt-anyname` (works!)

**Valid Tokens:**
```
✅ dummy-jwt-user123
✅ dummy-jwt-testuser
✅ dummy-jwt-alice
✅ dummy-jwt-whatever
```

---

### Production (Koyeb)

**Environment:**
```bash
AUTH_MODE=supabase  (or not set - defaults to supabase)
NODE_ENV=production
```

**URL:** `wss://api.umrah.app`

**Token:** Real JWT from Supabase (required!)

**Invalid Tokens:**
```
❌ dummy-jwt-user123  (will be rejected)
❌ mock-token-123     (will be rejected)
❌ any-fake-token     (will be rejected)
```

**Valid Token Example:**
```
✅ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

---

## 🧪 Testing Checklist

### Development Testing (Mock Mode)

- [ ] Connect with `dummy-jwt-user123`
- [ ] Connect with `dummy-jwt-alice` (different user)
- [ ] Verify userId in connection_status message matches
- [ ] Send nav.update message
- [ ] Receive nav.correction from server
- [ ] Test multiple concurrent connections with different mock users

---

### Production Testing (Real JWT)

- [ ] Get real JWT from Supabase auth
- [ ] Connect with real JWT token
- [ ] Verify authentication succeeds
- [ ] Verify mock tokens are rejected (❌ 401 Unauthorized)
- [ ] Test token expiration (reconnect after 1 hour)

---

## 🚨 Common Issues

### Issue 1: "Authentication failed" in Development

**Cause:** Backend not in mock mode

**Solution:**
```bash
# Check backend logs for:
[SupabaseJwtGuard] HTTP authentication running in MOCK mode

# If not present, set environment variable:
AUTH_MODE=mock
```

---

### Issue 2: Mock Token Works Locally but Not in Production

**This is EXPECTED behavior!**

Production uses Supabase JWT tokens. Mock tokens are **only for development**.

**Solution:** Get a real JWT token from Supabase auth.

---

### Issue 3: "Invalid token" with Real JWT

**Cause:** Token expired or invalid format

**Solution:**
1. Check token hasn't expired (JWTs expire after 1 hour)
2. Get fresh token from Supabase
3. Verify token is properly formatted (3 parts separated by dots)

---

## 📚 Token Format Reference

### Mock Token

**Format:** `dummy-jwt-{userId}`

**Example:** `dummy-jwt-user123`

**Structure:**
- Prefix: `dummy-jwt-`
- User ID: `user123` (can be anything)

**Valid in:** Development only

---

### Real JWT Token

**Format:** `{header}.{payload}.{signature}`

**Example:** `eyJhbGci...eyJzdWI...SflKxw`

**Structure:**
- Header (base64): Algorithm and token type
- Payload (base64): User claims (sub, email, exp, etc.)
- Signature: Cryptographic signature

**Valid in:** Production (and development if AUTH_MODE=supabase)

---

## 🔧 Environment Setup

### Development `.env` File

```bash
# apps/backend/.env

# Authentication
AUTH_MODE=mock
NODE_ENV=development

# Server
PORT=3000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
WS_ORIGIN=http://localhost:3000
```

---

### Production Environment Variables (Koyeb)

```bash
# Required for production
AUTH_MODE=supabase  # or leave unset (defaults to supabase)
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret

# Server
PORT=3000

# CORS
ALLOWED_ORIGINS=https://your-frontend.com
WS_ORIGIN=https://your-frontend.com
```

---

## 📖 Related Documentation

- **WebSocket Endpoints:** [WEBSOCKET_ENDPOINTS.md](./WEBSOCKET_ENDPOINTS.md)
- **Authentication Guide:** [docs/authentication/QUICK_START.md](./docs/authentication/QUICK_START.md)
- **Quran API:** [QURAN_API_DOCUMENTATION.md](./QURAN_API_DOCUMENTATION.md)

---

## ✉️ Quick Reference for Your Team

**Development Testing:**
```bash
# Mock token (works locally)
Token: dummy-jwt-user123
URL: ws://localhost:3000?token=dummy-jwt-user123
```

**Production Testing:**
```bash
# Real JWT token (get from Supabase)
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
URL: wss://api.umrah.app?token=REAL_JWT_TOKEN
```

**Test with wscat:**
```bash
# Development
wscat -c "ws://localhost:3000?token=dummy-jwt-testuser"

# Production (need real token)
wscat -c "wss://api.umrah.app?token=YOUR_REAL_JWT"
```

---

**Questions?** Contact the backend development team.

**Backend Repository:** https://github.com/Amineregayeg/umrah-hajj-realtime
