# Unity/3D Integration Guide

Complete technical reference for integrating the Umrah Hajj Real-time API with Unity/3D clients.

## Quick Links

- **Swagger UI**: `https://YOUR_APP.koyeb.app/docs` (interactive API documentation)
- **Quickstart Guide**: [UNITY_QUICKSTART.md](./UNITY_QUICKSTART.md) (minimal setup)
- **Environment Variables**: [API_ENV_VARS.md](./API_ENV_VARS.md)

## Base URLs

### REST API
```
https://YOUR_APP.koyeb.app
```

All HTTP endpoints use this base URL.

### WebSocket API
```
wss://YOUR_APP.koyeb.app/ws
```

Real-time navigation updates, AI prompts, and UI events.

**CRITICAL**: WebSocket connections MUST include JWT token in query parameter:
```
wss://YOUR_APP.koyeb.app/ws?token=YOUR_JWT_TOKEN
```

## Authentication & Authorization

### JWT Token Handshake

**Step 1**: Obtain JWT from authentication provider (Supabase or custom)

**Step 2**: Include JWT in WebSocket connection:
```
wss://YOUR_APP.koyeb.app/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 3**: Server validates JWT and opens connection, or rejects with 403.

### Token Requirements

- **Format**: Standard JWT (header.payload.signature)
- **Algorithm**: RS256 or HS256 (depends on `AUTH_MODE`)
- **Claims**: Must include `sub` (user ID) and `exp` (expiration)
- **TTL**: Recommended ≤24 hours; refresh before expiration
- **Rejection Codes**:
  - `401`: Token missing or malformed
  - `403`: Token invalid or expired, or origin mismatch

### Mock Auth Mode (Staging Only)

When `AUTH_MODE=mock`, use dummy token:
```
token=mock_user_token_123
```

**WARNING**: Do NOT use mock mode in production.

## WebSocket Event Contracts

The API uses 5 event types for real-time communication. All messages follow this structure:

### Message Format (JSON)

```json
{
  "type": "event.category",
  "timestamp": "2025-10-15T12:34:56.789Z",
  "payload": { /* event-specific data */ }
}
```

### Message Format (MessagePack - Optional)

When `ENABLE_MSGPACK=true`:
- Binary frames instead of text
- Same structure, encoded with MessagePack
- 30-40% smaller payload
- Faster serialization/deserialization

**Default**: MessagePack is **disabled** (JSON mode). Enable in environment variables if needed.

---

## Event Type 1: `nav.update` (Client → Server)

Sent by Unity client to report user's current position and navigation state.

**Direction**: Unity → API

**Frequency**: ≤10 Hz (max every 100ms)

**Purpose**: Track user location for route guidance and re-route detection

### Payload Schema

```json
{
  "type": "nav.update",
  "timestamp": "2025-10-15T12:34:56.789Z",
  "payload": {
    "userId": "user_abc123",
    "location": {
      "latitude": 21.4225,
      "longitude": 39.8262,
      "altitude": 300.5,
      "accuracy": 1.8,
      "floor": 0
    },
    "heading": 245.7,
    "speed": 1.2,
    "routeId": "route_xyz789",
    "currentSegmentIndex": 3
  }
}
```

### Field Definitions

| Field | Type | Unit | Required | Description |
|-------|------|------|----------|-------------|
| `userId` | string | - | ✅ | Unique user identifier (from JWT) |
| `location.latitude` | number | degrees | ✅ | WGS84 latitude (-90 to 90) |
| `location.longitude` | number | degrees | ✅ | WGS84 longitude (-180 to 180) |
| `location.altitude` | number | meters | ❌ | Height above sea level |
| `location.accuracy` | number | meters | ✅ | Horizontal accuracy (95% confidence) |
| `location.floor` | number | - | ❌ | Floor/level number (0=ground, 1=first, -1=basement) |
| `heading` | number | degrees | ✅ | Compass bearing (0=N, 90=E, 180=S, 270=W) |
| `speed` | number | m/s | ❌ | Movement speed |
| `routeId` | string | - | ✅ | Active route identifier |
| `currentSegmentIndex` | number | - | ✅ | Current segment in route (0-indexed) |

### Example (cURL for testing)

```bash
wscat -c "wss://YOUR_APP.koyeb.app/ws?token=YOUR_JWT"

# Send message:
{
  "type": "nav.update",
  "timestamp": "2025-10-15T12:34:56.789Z",
  "payload": {
    "userId": "user_123",
    "location": {
      "latitude": 21.4225,
      "longitude": 39.8262,
      "accuracy": 1.8,
      "floor": 0
    },
    "heading": 90.0,
    "routeId": "route_makkah_kaaba",
    "currentSegmentIndex": 0
  }
}
```

---

## Event Type 2: `nav.correction` (Server → Client)

Sent by API when user deviates from route and requires correction.

**Direction**: API → Unity

**Frequency**: ≈5 Hz (server-controlled, adaptive)

**Purpose**: Provide corrective navigation guidance

### Payload Schema

```json
{
  "type": "nav.correction",
  "timestamp": "2025-10-15T12:34:57.123Z",
  "payload": {
    "userId": "user_abc123",
    "routeId": "route_xyz789",
    "correctionType": "off-path",
    "currentLocation": {
      "latitude": 21.4230,
      "longitude": 39.8270,
      "floor": 0
    },
    "targetLocation": {
      "latitude": 21.4225,
      "longitude": 39.8262,
      "floor": 0
    },
    "distance": 6.8,
    "bearing": 185.0,
    "message": "Turn around and head south. You are 7 meters off the path."
  }
}
```

### Correction Types

| Type | Trigger | Description |
|------|---------|-------------|
| `off-path` | Distance >6m for ≥4s | User strayed from route |
| `wrong-direction` | Heading deflection >45° for ≥2s | User facing wrong way |
| `floor-mismatch` | Floor ≠ expected floor | User on wrong level |
| `reroute` | Manual or automatic reroute | New route calculated |

### Field Definitions

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `correctionType` | string | - | Type of correction (see table above) |
| `currentLocation` | object | - | User's current position |
| `targetLocation` | object | - | Nearest point on route or next waypoint |
| `distance` | number | meters | Distance to target |
| `bearing` | number | degrees | Direction to target (0-360) |
| `message` | string | - | Human-readable instruction (localized) |

---

## Event Type 3: `ai.prompt` (Server → Client)

Sent by API when AI voice assistant has audio guidance ready.

**Direction**: API → Unity

**Frequency**: On-demand (user-initiated or context-triggered)

**Purpose**: Deliver AI voice assistant responses

### Payload Schema

```json
{
  "type": "ai.prompt",
  "timestamp": "2025-10-15T12:35:00.456Z",
  "payload": {
    "userId": "user_abc123",
    "promptId": "prompt_def456",
    "audioUrl": "https://cdn.example.com/audio/prompt_def456.mp3",
    "transcript": "You are approaching the Kaaba. Please remove your shoes before entering the Mataf area.",
    "language": "en",
    "duration": 5.2,
    "priority": "high"
  }
}
```

### Priority Levels

| Priority | Behavior | Example Use Case |
|----------|----------|------------------|
| `high` | Interrupt current audio | Safety warning, critical instruction |
| `medium` | Queue after current audio | Navigation update, ritual guidance |
| `low` | Play when idle | Ambient info, educational content |

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `promptId` | string | Unique prompt identifier for tracking |
| `audioUrl` | string | URL to pregenerated audio file (MP3, 128kbps) |
| `transcript` | string | Text version of audio (for accessibility) |
| `language` | string | ISO 639-1 code (e.g., `en`, `ar`, `ur`) |
| `duration` | number | Audio duration in seconds |
| `priority` | string | Playback priority (`high`, `medium`, `low`) |

---

## Event Type 4: `ui.banner` (Server → Client)

Sent by API to display non-intrusive UI notifications.

**Direction**: API → Unity

**Frequency**: On-demand (event-driven)

**Purpose**: Display contextual information without audio interruption

### Payload Schema

```json
{
  "type": "ui.banner",
  "timestamp": "2025-10-15T12:35:05.789Z",
  "payload": {
    "bannerId": "banner_ghi789",
    "message": "Prayer time for Dhuhr is in 15 minutes",
    "severity": "info",
    "duration": 8,
    "actionLabel": "Set Reminder",
    "actionUrl": "/profile/reminders"
  }
}
```

### Severity Levels

| Severity | Color Hint | Icon | Example |
|----------|------------|------|---------|
| `info` | Blue | ℹ️ | Prayer time reminder |
| `warning` | Yellow | ⚠️ | Crowded area ahead |
| `error` | Red | ❌ | Route unavailable |
| `success` | Green | ✅ | Waypoint reached |

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `bannerId` | string | Unique banner identifier |
| `message` | string | Display text (localized) |
| `severity` | string | Visual severity (`info`, `warning`, `error`, `success`) |
| `duration` | number | Display duration in seconds (0 = persist until dismissed) |
| `actionLabel` | string | Optional button text (e.g., "View Details") |
| `actionUrl` | string | Optional callback path or deep link |

---

## Event Type 5: `state.set` (Server → Client)

Sent by API to update client application state.

**Direction**: API → Unity

**Frequency**: On-demand (state change events)

**Purpose**: Synchronize app state, trigger UI updates

### Payload Schema

```json
{
  "type": "state.set",
  "timestamp": "2025-10-15T12:35:10.123Z",
  "payload": {
    "stateKey": "navigation.mode",
    "stateValue": "guidance",
    "metadata": {
      "reason": "user_action",
      "previousValue": "idle"
    }
  }
}
```

### Common State Keys

| Key | Values | Description |
|-----|--------|-------------|
| `navigation.mode` | `idle`, `guidance`, `rerouting` | Current navigation mode |
| `user.ritual` | `tawaf`, `sai`, `standing`, `none` | Active ritual |
| `connection.quality` | `excellent`, `good`, `poor`, `offline` | Network quality |
| `audio.playing` | `true`, `false` | AI audio playback state |

---

## Budgets & Backpressure

### Client Send Rate Limits

| Event Type | Max Frequency | Burst Limit |
|------------|---------------|-------------|
| `nav.update` | 10 Hz (100ms) | 20 messages |
| Other events | As needed | - |

**Enforcement**: Server drops messages exceeding limits; client may receive `error` event.

### Server Send Rate

| Event Type | Typical Frequency | Max Queue Size |
|------------|-------------------|----------------|
| `nav.correction` | ≈5 Hz (adaptive) | 50 messages |
| `ai.prompt` | On-demand | 10 messages |
| `ui.banner` | On-demand | 20 messages |
| `state.set` | On-demand | 30 messages |

**Queue Overflow**: Oldest messages dropped (FIFO).

### Heartbeat & Keepalive

- **Ping Interval**: Client should send ping every 15 seconds
- **Pong Timeout**: Server expects pong within 5 seconds
- **Auto-Disconnect**: No pong received → connection closed after 20 seconds

**Implementation** (client-side):
```javascript
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 15000);
```

### Reconnection Strategy

**Exponential Backoff**:
1. Initial reconnect: 500ms
2. After 2nd failure: 1s
3. After 3rd failure: 2s
4. After 4th failure: 4s
5. Max backoff: 8s

**Jitter**: Add ±20% random jitter to avoid thundering herd.

**Example** (pseudo-code):
```csharp
int attempts = 0;
float backoff = 0.5f;

while (attempts < 10) {
    await Task.Delay((int)(backoff * 1000 * (0.8 + Random.value * 0.4)));
    if (TryConnect()) break;
    attempts++;
    backoff = Math.Min(backoff * 2, 8.0f);
}
```

---

## Multi-Floor Routing

### Floor Representation

- **Ground Floor**: `floor: 0`
- **Above Ground**: `floor: 1, 2, 3, ...`
- **Below Ground**: `floor: -1, -2, -3, ...`

### Floor Transitions

When route includes floor change:
```json
{
  "type": "nav.correction",
  "payload": {
    "correctionType": "floor-mismatch",
    "currentLocation": { "floor": 0 },
    "targetLocation": { "floor": 1 },
    "message": "Proceed to stairs/elevator to reach Floor 1"
  }
}
```

---

## Re-Route Triggers

Server automatically recalculates route when:

1. **Off-Path**: User >6m from route for ≥4 seconds
2. **Wrong Direction**: Heading deflection >45° for ≥2 seconds
3. **Blocked Route**: Server detects route obstacle (e.g., crowd, closure)
4. **Manual Request**: User explicitly requests new route

### Re-Route Flow

1. Server sends `state.set` with `navigation.mode: "rerouting"`
2. Server calculates new route
3. Server sends `nav.correction` with `correctionType: "reroute"`
4. Server sends `state.set` with `navigation.mode: "guidance"`

---

## Accuracy Targets

### Position Accuracy

| Metric | Target | Measurement |
|--------|--------|-------------|
| Median error | ≤2.0 m | 50th percentile |
| 95th percentile | ≤4.0 m | p95 |
| Outliers | <1% >10m | Exclude GPS glitches |

### Heading Accuracy

| Metric | Target | Notes |
|--------|--------|-------|
| Median error | ≤15° | Compass calibration dependent |
| Useful range | 0-360° | True north reference |

---

## REST API Endpoints

### Prayer Times

**Endpoint**: `GET /content/prayer-times`

**Query Parameters**:
- `lat` (optional): Latitude (defaults to Makkah)
- `lng` (optional): Longitude (defaults to Makkah)
- `date` (optional): Date in ISO 8601 format (defaults to today)

**Example**:
```bash
curl "https://YOUR_APP.koyeb.app/content/prayer-times?lat=21.4225&lng=39.8262"
```

**Response**:
```json
{
  "location": {
    "city": "Mecca",
    "country": "Saudi Arabia",
    "latitude": 21.4225,
    "longitude": 39.8262
  },
  "date": "2025-10-15",
  "times": {
    "fajr": "04:45",
    "sunrise": "06:05",
    "dhuhr": "12:25",
    "asr": "15:45",
    "maghrib": "18:45",
    "isha": "20:15"
  },
  "hijriDate": {
    "day": 15,
    "month": "Rajab",
    "year": 1446
  },
  "timezone": "Asia/Riyadh",
  "method": "Umm Al-Qura University, Makkah"
}
```

### Qibla Direction

**Endpoint**: `GET /content/qibla`

**Query Parameters**:
- `lat` (required): User's latitude
- `lng` (required): User's longitude

**Example**:
```bash
curl "https://YOUR_APP.koyeb.app/content/qibla?lat=40.7128&lng=-74.0060"
```

**Response**:
```json
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "qibla": {
    "direction": 58.48,
    "distance": 9842.5
  },
  "kaaba": {
    "latitude": 21.4225,
    "longitude": 39.8262
  },
  "calculatedAt": "2025-10-15T12:00:00.000Z"
}
```

**Fields**:
- `qibla.direction`: Bearing in degrees (0-360, true north)
- `qibla.distance`: Distance to Kaaba in kilometers

### Quran Content

**Get Surah**: `GET /content/quran/surah/:id?lang=ar`

**Get Ayah**: `GET /content/quran/ayah?surah=1&ayah=1&lang=ar`

**Search Quran**: `GET /content/quran/search?q=الله&lang=ar&limit=20`

See Swagger docs for full details: `https://YOUR_APP.koyeb.app/docs`

### AI Voice Token

**Endpoint**: `POST /ai/voice/token`

**Purpose**: Obtain ephemeral token for OpenAI Realtime API (voice assistant)

**Headers**:
- `Authorization: Bearer YOUR_JWT_TOKEN`

**Request Body**:
```json
{
  "scope": "voice_realtime",
  "ttl": 60
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-10-15T12:01:00.000Z",
  "ttl": 60,
  "scope": "voice_realtime"
}
```

**Rate Limits**:
- **Limit**: 5 requests per minute per user
- **Burst**: 10 requests
- **429 Response**: `{ "error": "Rate limit exceeded", "retryAfter": 30 }`

**TTL**:
- **Max**: 60 seconds
- **Recommended**: 45-60 seconds (buffer for network latency)

---

## Error Codes & Retry Guidance

### WebSocket Errors

| Code | Reason | Retry? | Fix |
|------|--------|--------|-----|
| 401 | Missing/invalid token | ❌ | Refresh JWT, reconnect |
| 403 | Origin mismatch | ❌ | Check `WS_ORIGIN` config |
| 429 | Rate limit exceeded | ✅ | Exponential backoff |
| 1000 | Normal closure | ❌ | No action needed |
| 1001 | Server going away | ✅ | Reconnect after 1s |
| 1002 | Protocol error | ❌ | Check message format |
| 1011 | Internal server error | ✅ | Reconnect after 5s |

### REST API Errors

| Code | Meaning | Retry? | Fix |
|------|---------|--------|-----|
| 400 | Bad request (validation) | ❌ | Fix request payload |
| 401 | Unauthorized | ❌ | Refresh JWT |
| 403 | Forbidden | ❌ | Check permissions |
| 404 | Not found | ❌ | Verify endpoint URL |
| 429 | Rate limited | ✅ | Respect `Retry-After` header |
| 500 | Server error | ✅ | Retry after 10s |
| 503 | Service unavailable | ✅ | Retry after 30s |

---

## Sample Code

### Unity WebSocket Client (C#)

```csharp
using UnityEngine;
using System;
using WebSocketSharp;

public class NavWebSocketClient : MonoBehaviour
{
    private WebSocket ws;
    private float lastUpdateTime = 0f;
    private const float UPDATE_INTERVAL = 0.1f; // 10 Hz

    void Start()
    {
        string jwtToken = "YOUR_JWT_TOKEN"; // Obtain from auth
        string wsUrl = $"wss://YOUR_APP.koyeb.app/ws?token={jwtToken}";

        ws = new WebSocket(wsUrl);

        ws.OnOpen += (sender, e) => {
            Debug.Log("WebSocket connected");
        };

        ws.OnMessage += (sender, e) => {
            if (e.IsText) {
                HandleMessage(e.Data);
            } else if (e.IsBinary) {
                // MessagePack decoding
                // HandleMessagePackMessage(e.RawData);
            }
        };

        ws.OnError += (sender, e) => {
            Debug.LogError($"WebSocket error: {e.Message}");
        };

        ws.OnClose += (sender, e) => {
            Debug.Log($"WebSocket closed: {e.Code} {e.Reason}");
            // Implement reconnection logic here
        };

        ws.Connect();
    }

    void Update()
    {
        if (Time.time - lastUpdateTime >= UPDATE_INTERVAL)
        {
            SendNavUpdate();
            lastUpdateTime = Time.time;
        }
    }

    void SendNavUpdate()
    {
        if (ws == null || ws.ReadyState != WebSocketState.Open) return;

        var navUpdate = new
        {
            type = "nav.update",
            timestamp = DateTime.UtcNow.ToString("o"),
            payload = new
            {
                userId = "user_123",
                location = new
                {
                    latitude = 21.4225,
                    longitude = 39.8262,
                    accuracy = 1.5,
                    floor = 0
                },
                heading = 90.0,
                routeId = "route_makkah_kaaba",
                currentSegmentIndex = 0
            }
        };

        string json = JsonUtility.ToJson(navUpdate);
        ws.Send(json);
    }

    void HandleMessage(string json)
    {
        // Parse JSON and handle events
        // var message = JsonUtility.FromJson<WebSocketMessage>(json);
        // switch (message.type) {
        //     case "nav.correction": HandleNavCorrection(message); break;
        //     case "ai.prompt": HandleAIPrompt(message); break;
        //     case "ui.banner": HandleUIBanner(message); break;
        //     case "state.set": HandleStateSet(message); break;
        // }
    }

    void OnDestroy()
    {
        if (ws != null) {
            ws.Close();
        }
    }
}
```

### cURL Examples

**Health Check**:
```bash
curl https://YOUR_APP.koyeb.app/metrics/healthz
```

**Prayer Times**:
```bash
curl "https://YOUR_APP.koyeb.app/content/prayer-times?lat=21.4225&lng=39.8262"
```

**Qibla Direction**:
```bash
curl "https://YOUR_APP.koyeb.app/content/qibla?lat=40.7128&lng=-74.0060"
```

**Quran Search**:
```bash
curl "https://YOUR_APP.koyeb.app/content/quran/search?q=الله&lang=ar&limit=10"
```

**AI Voice Token** (requires JWT):
```bash
curl -X POST https://YOUR_APP.koyeb.app/ai/voice/token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scope": "voice_realtime", "ttl": 60}'
```

### wscat (WebSocket CLI)

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c "wss://YOUR_APP.koyeb.app/ws?token=YOUR_JWT"

# Send nav.update
> {"type":"nav.update","timestamp":"2025-10-15T12:00:00.000Z","payload":{"userId":"user_123","location":{"latitude":21.4225,"longitude":39.8262,"accuracy":1.5,"floor":0},"heading":90.0,"routeId":"route_test","currentSegmentIndex":0}}
```

---

## Testing & Debugging

### Test Environment

- **Staging URL**: `https://YOUR_STAGING_APP.koyeb.app`
- **Mock Auth**: Set `AUTH_MODE=mock`, use token `mock_user_token_123`
- **Swagger UI**: `https://YOUR_APP.koyeb.app/docs` (interactive testing)

### Debug Logging

Server logs WebSocket events. Check Koyeb dashboard logs for:
- `[WebSocket] Connection established`
- `[WebSocket] Origin validation PASSED/FAILED`
- `[NavGateway] Received nav.update from user_123`
- `[NavGateway] Sending nav.correction to user_123`

### Common Issues

**Issue**: WebSocket connection rejected (403)
**Fix**: Verify `WS_ORIGIN` matches your client domain exactly

**Issue**: No `nav.correction` events received
**Fix**: Ensure you're sending `nav.update` at ≥1 Hz

**Issue**: High latency or dropped messages
**Fix**: Check network quality, reduce update frequency, or enable MessagePack

---

## Performance Optimization

1. **Use MessagePack** if bandwidth is limited (30-40% smaller)
2. **Batch UI updates** instead of updating per frame
3. **Throttle location updates** to 5-10 Hz (avoid 60 Hz)
4. **Cache prayer times** for 24 hours (they don't change frequently)
5. **Preload audio prompts** when network is idle

---

## Further Reading

- [Unity Quickstart](./UNITY_QUICKSTART.md)
- [API Environment Variables](./API_ENV_VARS.md)
- [Security Headers](./SECURITY_HEADERS.md)
- [Deployment Guide](./DEPLOY_KOYEB.md)
- [Swagger API Docs](https://YOUR_APP.koyeb.app/docs)

---

## Support

- **Issues**: https://github.com/YOUR_ORG/umrah-hajj-realtime/issues
- **Email**: support@yourdomain.com
- **Slack**: #unity-integration (internal)
