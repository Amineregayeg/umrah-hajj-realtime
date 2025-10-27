# Authentication API Reference

**Complete reference for all authentication-related endpoints**

---

## Base URL

- **Development:** `http://localhost:3001`
- **Production:** `https://psychological-jilli-amineregayeg-1fe35444.koyeb.app`

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

### Token Types

#### Development (Mock Mode)
```
Bearer dummy-jwt-{userId}

Example: Bearer dummy-jwt-user123
```

#### Production (Supabase Mode)
```
Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Endpoints

### 1. Voice Token Generation

Generate ephemeral JWT tokens for AI voice realtime integration.

**Endpoint:** `POST /ai/voice/token`
**Authentication:** Required
**Rate Limit:** 5 requests/minute per user (burst: 10)

#### Request

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "language": "ar",
  "gender": "male",
  "sessionId": "optional-session-tracking-id"
}
```

**Parameters:**

| Field | Type | Required | Options | Description |
|-------|------|----------|---------|-------------|
| `language` | string | Yes | `ar`, `en`, `ur`, `id`, `fr`, `tr`, `fa`, `es`, `bn`, `ms` | Voice language |
| `gender` | string | Yes | `male`, `female`, `neutral` | Voice gender |
| `sessionId` | string | No | Any string | Optional session tracking ID |

#### Response

**Success (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoxNzAzMDgwODYwLCJpYXQiOjE3MDMwODA4MDAsInNjb3BlIjpbInJlYWx0aW1lLnZvaWNlIl0sImxhbmciOiJhciIsImdlbmRlciI6Im1hbGUiLCJzZXNzaW9uSWQiOiJvcHRpb25hbC1zZXNzaW9uLWlkIn0.xxx",
  "expiresAt": 1703080860,
  "ttl": 60,
  "scope": ["realtime.voice"],
  "language": "ar",
  "gender": "male"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | JWT token for voice service |
| `expiresAt` | number | Unix timestamp when token expires |
| `ttl` | number | Time-to-live in seconds (max 60) |
| `scope` | string[] | Token permissions (always `["realtime.voice"]`) |
| `language` | string | Requested language |
| `gender` | string | Requested voice gender |

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 429 | Too Many Requests | Rate limit exceeded (5/min) |
| 400 | Bad Request | Invalid language or gender |
| 500 | Internal Server Error | Server error |

#### Examples

**cURL:**
```bash
# Development (mock auth)
curl -X POST http://localhost:3001/ai/voice/token \
  -H "Authorization: Bearer dummy-jwt-user123" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ar",
    "gender": "male",
    "sessionId": "session-abc-123"
  }'

# Production (Supabase auth)
curl -X POST https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/ai/voice/token \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en",
    "gender": "female"
  }'
```

**JavaScript:**
```javascript
const response = await fetch(`${API_URL}/ai/voice/token`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    language: 'ar',
    gender: 'male',
    sessionId: 'session-123'
  })
});

const data = await response.json();
console.log('Voice token:', data.token);
console.log('Expires in:', data.ttl, 'seconds');
```

**Python:**
```python
import requests

response = requests.post(
    f"{API_URL}/ai/voice/token",
    headers={
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    },
    json={
        "language": "ar",
        "gender": "male",
        "sessionId": "session-123"
    }
)

data = response.json()
print(f"Voice token: {data['token']}")
print(f"Expires at: {data['expiresAt']}")
```

#### Token Claims

The generated voice token contains these claims:

```json
{
  "sub": "user-uuid",           // User ID from auth JWT
  "exp": 1703080860,            // Expiration (max 60s from now)
  "iat": 1703080800,            // Issued at timestamp
  "scope": ["realtime.voice"],  // Allowed scopes
  "lang": "ar",                 // Language code
  "gender": "male",             // Voice gender
  "sessionId": "session-123"    // Optional session ID
}
```

#### Rate Limiting

- **Standard limit:** 5 requests per minute per user
- **Burst capacity:** 10 requests in 2-minute window
- **Reset:** Sliding window (requests expire after 60 seconds)

**Rate limit response:**
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Please try again later.",
  "error": "Too Many Requests"
}
```

**Retry strategy:**
```javascript
async function getTokenWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${API_URL}/ai/voice/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language: 'ar', gender: 'male' })
      });

      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return await response.json();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
    }
  }
}
```

---

### 2. Navigation Snapshot

Submit navigation snapshots with authentication.

**Endpoint:** `POST /nav/snapshot`
**Authentication:** Required
**Rate Limit:** 1 request/minute per user

#### Request

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "latitude": 21.4225,
  "longitude": 39.8262,
  "floor": 1,
  "timestamp": "2025-10-27T10:00:00Z"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | number | Yes | GPS latitude (-90 to 90) |
| `longitude` | number | Yes | GPS longitude (-180 to 180) |
| `floor` | number | Yes | Floor level (0, 1, 2, etc.) |
| `timestamp` | string | Yes | ISO 8601 timestamp |

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "snapshotId": "snapshot-abc-123",
  "receivedAt": "2025-10-27T10:00:01Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 429 | Too Many Requests | Rate limit exceeded (1/min) |
| 400 | Bad Request | Invalid coordinates or timestamp |
| 500 | Internal Server Error | Server error |

#### Examples

**cURL:**
```bash
curl -X POST http://localhost:3001/nav/snapshot \
  -H "Authorization: Bearer dummy-jwt-user123" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 21.4225,
    "longitude": 39.8262,
    "floor": 1,
    "timestamp": "2025-10-27T10:00:00Z"
  }'
```

**JavaScript:**
```javascript
const response = await fetch(`${API_URL}/nav/snapshot`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 21.4225,
    longitude: 39.8262,
    floor: 1,
    timestamp: new Date().toISOString()
  })
});

const data = await response.json();
console.log('Snapshot ID:', data.snapshotId);
```

---

### 3. WebSocket Connection

Real-time WebSocket connection with authentication.

**Endpoint:** `ws://localhost:3001` or `wss://your-api.com`
**Authentication:** Required (JWT in header or query param)
**Rate Limit:** None (connection-based)

#### Connection Methods

**Method 1: Authorization Header**
```javascript
const ws = new WebSocket('ws://localhost:3001', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});
```

**Method 2: Query Parameter**
```javascript
const ws = new WebSocket(
  `ws://localhost:3001?token=${jwtToken}`
);
```

#### Connection Events

**On Connect:**
```javascript
ws.onopen = () => {
  console.log('WebSocket connected');
  // Send initial message
  ws.send(JSON.stringify({ type: 'ping' }));
};
```

**On Message:**
```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

**On Error:**
```javascript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

**On Close:**
```javascript
ws.onclose = (event) => {
  console.log('WebSocket closed:', event.code, event.reason);

  // Reconnect if needed
  if (event.code !== 1000) {
    setTimeout(reconnect, 5000);
  }
};
```

#### Authentication Errors

| Close Code | Reason | Description |
|------------|--------|-------------|
| 4001 | Unauthorized | Missing or invalid token |
| 4003 | Forbidden | Origin not allowed |
| 4029 | Too Many Requests | Rate limit exceeded |

#### Examples

**Full WebSocket Client:**
```javascript
class AuthenticatedWebSocket {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    this.ws = new WebSocket(
      `${this.url}?token=${this.token}`
    );

    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('Error:', error);
    };

    this.ws.onclose = (event) => {
      console.log('Closed:', event.code);

      if (event.code === 4001) {
        console.error('Authentication failed');
        return;
      }

      this.reconnect();
    };
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.ws?.close(1000, 'Client closing');
  }

  handleMessage(data) {
    // Override in subclass
    console.log('Message:', data);
  }
}

// Usage
const ws = new AuthenticatedWebSocket(
  'ws://localhost:3001',
  'dummy-jwt-user123'
);
ws.connect();
```

---

## Error Codes

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### WebSocket Close Codes

| Code | Description |
|------|-------------|
| 1000 | Normal closure |
| 1001 | Going away |
| 4001 | Unauthorized (auth failed) |
| 4003 | Forbidden (origin not allowed) |
| 4029 | Too Many Requests |

---

## Supported Languages

| Code | Language | Native Name |
|------|----------|-------------|
| `ar` | Arabic | العربية |
| `en` | English | English |
| `ur` | Urdu | اردو |
| `id` | Indonesian | Bahasa Indonesia |
| `fr` | French | Français |
| `tr` | Turkish | Türkçe |
| `fa` | Persian | فارسی |
| `es` | Spanish | Español |
| `bn` | Bengali | বাংলা |
| `ms` | Malay | Bahasa Melayu |

---

## Voice Genders

| Value | Description |
|-------|-------------|
| `male` | Male voice |
| `female` | Female voice |
| `neutral` | Gender-neutral voice |

---

## Security Headers

All responses include these security headers:

```
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

See [SECURITY_HEADERS.md](../../SECURITY_HEADERS.md) for details.

---

## Rate Limits

| Endpoint | Limit | Window | Burst |
|----------|-------|--------|-------|
| POST /ai/voice/token | 5 req/min | 60s | 10 |
| POST /nav/snapshot | 1 req/min | 60s | - |
| WebSocket | Connection-based | - | - |

**Rate limit headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1703080860
```

---

## Testing

### Postman Collection

Import this collection to test all endpoints:

```json
{
  "info": {
    "name": "Umrah Hajj Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Voice Token",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer dummy-jwt-user123"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"language\": \"ar\",\n  \"gender\": \"male\"\n}"
        },
        "url": {
          "raw": "http://localhost:3001/ai/voice/token",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3001",
          "path": ["ai", "voice", "token"]
        }
      }
    }
  ]
}
```

### Test Scripts

See [QUICK_START.md](./QUICK_START.md) for test scripts and examples.

---

## Changelog

### v1.0.0 (October 2025)
- Initial API release
- Voice token generation endpoint
- Navigation snapshot endpoint
- WebSocket authentication
- Rate limiting
- Comprehensive error handling

---

**API Documentation:** http://localhost:3001/docs (Swagger)
**Repository:** https://github.com/Amineregayeg/umrah-hajj-realtime
**Support:** Create an issue on GitHub
