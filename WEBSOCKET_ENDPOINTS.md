# WebSocket Endpoints Documentation

**For Developers & Unity Team**

**Production Backend:** `https://api.umrah.app`

**Last Updated:** October 29, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [WebSocket Endpoints](#websocket-endpoints)
3. [Authentication](#authentication)
4. [Connection Examples](#connection-examples)
5. [Navigation WebSocket Events](#navigation-websocket-events)
6. [AI Realtime WebSocket Events](#ai-realtime-websocket-events)
7. [Error Handling](#error-handling)
8. [Testing](#testing)

---

## Overview

The backend provides **2 WebSocket endpoints**:

| Endpoint | Purpose | Status | Authentication |
|----------|---------|--------|---------------|
| **`wss://api.umrah.app`** | Navigation & real-time updates | ✅ Active | Required (JWT) |
| **`wss://api.umrah.app/ai/realtime`** | AI voice chat (OpenAI Realtime API) | 🔒 Disabled (feature flag OFF) | Required (JWT) |

**Protocol:** Native WebSocket (not Socket.IO)

**Message Format:** JSON (with optional MessagePack support)

---

## WebSocket Endpoints

### 1. Navigation WebSocket (Primary)

**Production URL:**
```
wss://api.umrah.app
```

**Local Development:**
```
ws://localhost:3000
```

**Purpose:**
- Real-time GPS location updates
- Navigation corrections
- State synchronization
- UI notifications
- Heartbeat/ping-pong

**Status:** ✅ **Active and ready for use**

---

### 2. AI Realtime WebSocket

**Production URL:**
```
wss://api.umrah.app/ai/realtime
```

**Local Development:**
```
ws://localhost:3000/ai/realtime
```

**Purpose:**
- Voice chat with AI guide (OpenAI Realtime API)
- Voice commands
- Ritual state tracking
- Multi-language support

**Status:** 🔒 **Deployed but DISABLED** (feature flags OFF - waiting for QA approval)

---

## Authentication

Both WebSocket endpoints require JWT authentication.

### Method 1: Query Parameter (Recommended)

```javascript
const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const ws = new WebSocket(`wss://api.umrah.app?token=${jwtToken}`);
```

### Method 2: Authorization Header

```javascript
const ws = new WebSocket('wss://api.umrah.app', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});
```

### Method 3: Custom Protocol (Unity)

```csharp
// Unity C#
string jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
string wsUrl = $"wss://api.umrah.app?token={jwtToken}";

WebSocket ws = new WebSocket(wsUrl);
ws.Connect();
```

### Getting a JWT Token

**Option 1: Mock Authentication (Development)**
```bash
curl -X POST "https://api.umrah.app/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"username": "test@example.com"}'
```

**Option 2: Supabase Authentication (Production)**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

const jwtToken = data.session.access_token;
```

---

## Connection Examples

### JavaScript/TypeScript

```typescript
// Navigation WebSocket
const jwtToken = "YOUR_JWT_TOKEN";
const ws = new WebSocket(`wss://api.umrah.app?token=${jwtToken}`);

ws.onopen = () => {
  console.log('WebSocket connected');

  // Wait for welcome message
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);

  if (message.event === 'connection_status') {
    console.log('Connected:', message.data);
    // connection_status includes:
    // - authenticated: true
    // - userId: "your-user-id"
    // - features: { heartbeat_interval, rate_limit, etc. }
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket closed');
};

// Send a message
const sendMessage = (event, data) => {
  ws.send(JSON.stringify({
    event: event,
    data: {
      ...data,
      ts: Date.now(),
      seq: Date.now()
    }
  }));
};

// Example: Send GPS update
sendMessage('nav.update', {
  lat: 21.4225,
  lon: 39.8262,
  heading: 270,
  speed: 1.5
});
```

---

### Unity/C#

```csharp
using System;
using WebSocketSharp;
using Newtonsoft.Json;

public class WebSocketManager : MonoBehaviour
{
    private WebSocket ws;
    private string jwtToken = "YOUR_JWT_TOKEN";

    void Start()
    {
        ConnectWebSocket();
    }

    void ConnectWebSocket()
    {
        string wsUrl = $"wss://api.umrah.app?token={jwtToken}";
        ws = new WebSocket(wsUrl);

        ws.OnOpen += OnWebSocketOpen;
        ws.OnMessage += OnWebSocketMessage;
        ws.OnError += OnWebSocketError;
        ws.OnClose += OnWebSocketClose;

        ws.Connect();
    }

    void OnWebSocketOpen(object sender, EventArgs e)
    {
        Debug.Log("WebSocket connected");
    }

    void OnWebSocketMessage(object sender, MessageEventArgs e)
    {
        var message = JsonConvert.DeserializeObject<WebSocketMessage>(e.Data);
        Debug.Log($"Received: {message.@event}");

        switch (message.@event)
        {
            case "connection_status":
                HandleConnectionStatus(message.data);
                break;
            case "nav.correction":
                HandleNavCorrection(message.data);
                break;
            // Handle other events
        }
    }

    void OnWebSocketError(object sender, ErrorEventArgs e)
    {
        Debug.LogError($"WebSocket error: {e.Message}");
    }

    void OnWebSocketClose(object sender, CloseEventArgs e)
    {
        Debug.Log("WebSocket closed");
    }

    void SendGPSUpdate(double lat, double lon, double heading, double speed)
    {
        var message = new
        {
            @event = "nav.update",
            data = new
            {
                lat = lat,
                lon = lon,
                heading = heading,
                speed = speed,
                ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                seq = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            }
        };

        ws.Send(JsonConvert.SerializeObject(message));
    }

    [Serializable]
    public class WebSocketMessage
    {
        public string @event;
        public object data;
    }
}
```

---

### Flutter/Dart

```dart
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';

class WebSocketService {
  late WebSocketChannel channel;
  String jwtToken = "YOUR_JWT_TOKEN";

  void connect() {
    final wsUrl = Uri.parse('wss://api.umrah.app?token=$jwtToken');
    channel = WebSocketChannel.connect(wsUrl);

    // Listen for messages
    channel.stream.listen(
      (message) {
        final data = jsonDecode(message);
        print('Received: ${data['event']}');

        if (data['event'] == 'connection_status') {
          print('Connected: ${data['data']['userId']}');
        }
      },
      onError: (error) => print('WebSocket error: $error'),
      onDone: () => print('WebSocket closed'),
    );
  }

  void sendGPSUpdate(double lat, double lon, double heading, double speed) {
    final message = jsonEncode({
      'event': 'nav.update',
      'data': {
        'lat': lat,
        'lon': lon,
        'heading': heading,
        'speed': speed,
        'ts': DateTime.now().millisecondsSinceEpoch,
        'seq': DateTime.now().millisecondsSinceEpoch,
      }
    });

    channel.sink.add(message);
  }

  void dispose() {
    channel.sink.close();
  }
}
```

---

## Navigation WebSocket Events

### Client → Server (Send)

#### 1. `nav.update` - GPS Location Update

```json
{
  "event": "nav.update",
  "data": {
    "lat": 21.4225,
    "lon": 39.8262,
    "heading": 270,
    "speed": 1.5,
    "accuracy": 5.0,
    "ts": 1698765432000,
    "seq": 1001
  }
}
```

**Fields:**
- `lat` (number, required) - Latitude
- `lon` (number, required) - Longitude
- `heading` (number, optional) - Compass heading in degrees (0-360)
- `speed` (number, optional) - Speed in m/s
- `accuracy` (number, optional) - GPS accuracy in meters
- `ts` (number, required) - Timestamp (milliseconds since epoch)
- `seq` (number, required) - Sequence number for ordering

**Response:**
```json
{
  "event": "success",
  "data": {
    "success": true,
    "operation": "nav.update"
  }
}
```

---

#### 2. `state.set` - Update User State

```json
{
  "event": "state.set",
  "data": {
    "key": "ritual_stage",
    "value": "tawaf",
    "ts": 1698765432000,
    "seq": 1002
  }
}
```

**Fields:**
- `key` (string, required) - State key
- `value` (any, required) - State value
- `ts` (number, required) - Timestamp
- `seq` (number, required) - Sequence number

---

#### 3. `ping` - Heartbeat

```json
{
  "event": "ping",
  "data": {
    "ts": 1698765432000
  }
}
```

**Response:**
```json
{
  "event": "pong",
  "data": {
    "timestamp": 1698765432100
  }
}
```

---

### Server → Client (Receive)

#### 1. `connection_status` - Welcome Message

Sent immediately after successful connection.

```json
{
  "event": "connection_status",
  "data": {
    "status": "connected",
    "authenticated": true,
    "userId": "user_abc123",
    "timestamp": 1698765432000,
    "features": {
      "heartbeat_interval": 15000,
      "rate_limit": "10Hz client, 5Hz server",
      "queue_limit": 50,
      "validation": "Zod schemas",
      "messagepack_enabled": false,
      "content_type": "application/json"
    }
  }
}
```

---

#### 2. `nav.correction` - Navigation Correction

Sent when the server detects the user is off-track.

```json
{
  "event": "nav.correction",
  "data": {
    "ts": 1698765432000,
    "seq": 2001,
    "delta": {
      "lat": 0.0001,
      "lon": -0.0002
    },
    "snapTo": {
      "lat": 21.4226,
      "lon": 39.8260
    },
    "confidence": 0.95
  }
}
```

**Fields:**
- `delta` (object) - Correction delta (how much to adjust)
- `snapTo` (object) - Suggested corrected position
- `confidence` (number) - Confidence level (0-1)

---

#### 3. `ui.banner` - UI Notification

```json
{
  "event": "ui.banner",
  "data": {
    "message": "You are approaching Bab As-Salam gate",
    "type": "info",
    "duration": 5000,
    "ts": 1698765432000,
    "seq": 2002
  }
}
```

---

#### 4. `error` - Error Message

```json
{
  "event": "error",
  "data": {
    "success": false,
    "message": "Invalid message structure",
    "timestamp": 1698765432000
  }
}
```

---

## AI Realtime WebSocket Events

**⚠️ Note:** This endpoint is **DISABLED** by default (feature flags OFF). See [AI Usage Documentation](./AI_USAGE_DOCUMENTATION.md) for enabling instructions.

### Connection

```javascript
const ws = new WebSocket(`wss://api.umrah.app/ai/realtime?token=${jwtToken}`);
```

### Client → Server (Send)

#### 1. `create_session` - Create AI Session

```json
{
  "event": "create_session",
  "data": {
    "language": "en",
    "ritualType": "umrah"
  }
}
```

**Response:**
```json
{
  "type": "session_created",
  "sessionId": "sess_abc123",
  "voice": "verse",
  "language": "en",
  "expiresAt": 1698765492000
}
```

---

#### 2. `client_message` - Forward Audio/Messages to AI

```json
{
  "event": "client_message",
  "data": {
    "type": "input_audio_buffer.append",
    "audio": "base64_encoded_audio_data"
  }
}
```

---

#### 3. `update_ritual_state` - Update Ritual Progress

```json
{
  "event": "update_ritual_state",
  "data": {
    "stage": "tawaf",
    "tawafLap": 3
  }
}
```

---

### Server → Client (Receive)

#### 1. `ai_message` - AI Response

```json
{
  "type": "ai_message",
  "data": {
    "type": "response.audio.delta",
    "delta": "base64_encoded_audio_chunk"
  }
}
```

---

#### 2. `voice_command` - Voice Command Detected

```json
{
  "type": "voice_command",
  "command": "SHOW_TIMELINE",
  "action": "show_timeline"
}
```

---

## Error Handling

### Common Errors

#### 1. Authentication Failed

**Connection closes immediately with close code 1008.**

**Reason:**
- Invalid JWT token
- Expired JWT token
- Missing Authorization header/query param

**Solution:**
- Get a fresh JWT token
- Ensure token is passed correctly

---

#### 2. Origin Not Allowed

**Connection closes immediately with close code 1008.**

**Error logged on server:**
```
WebSocket connection REJECTED: Origin 'https://example.com' does not match required WS_ORIGIN
```

**Reason:**
- Origin header doesn't match `ALLOWED_ORIGINS` environment variable

**Solution:**
- Ensure your domain is in the allowed origins list
- Contact backend team to add your origin

---

#### 3. Rate Limit Exceeded

**Server sends error message:**
```json
{
  "event": "error",
  "data": {
    "success": false,
    "message": "Rate limit exceeded. Maximum 10 messages per second.",
    "timestamp": 1698765432000
  }
}
```

**Reason:**
- Sending more than 10 messages per second

**Solution:**
- Throttle your messages to ≤ 10Hz
- Batch updates if possible

---

#### 4. Invalid Message Format

```json
{
  "event": "error",
  "data": {
    "success": false,
    "message": "Invalid message format",
    "timestamp": 1698765432000
  }
}
```

**Reason:**
- Message doesn't match expected JSON schema
- Missing required fields (`event`, `data`, `ts`, `seq`)

**Solution:**
- Ensure all messages follow the schema
- Include `ts` (timestamp) and `seq` (sequence number)

---

## Testing

### Using wscat (Command Line)

**Install wscat:**
```bash
npm install -g wscat
```

**Connect to Navigation WebSocket:**
```bash
# Get JWT token first
TOKEN=$(curl -X POST "https://api.umrah.app/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"username": "test@example.com"}' | jq -r '.access_token')

# Connect
wscat -c "wss://api.umrah.app?token=$TOKEN"
```

**Send a message:**
```json
{"event": "nav.update", "data": {"lat": 21.4225, "lon": 39.8262, "heading": 270, "speed": 1.5, "ts": 1698765432000, "seq": 1001}}
```

---

### Using Browser DevTools

```javascript
// Open browser console (F12) on any HTTPS page

const jwtToken = "YOUR_JWT_TOKEN";
const ws = new WebSocket(`wss://api.umrah.app?token=${jwtToken}`);

ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Received:', JSON.parse(e.data));
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = () => console.log('Closed');

// Send test message
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
```

---

### Testing Checklist

- [ ] Can connect to `wss://api.umrah.app` with valid JWT
- [ ] Receive `connection_status` welcome message
- [ ] Can send `nav.update` messages
- [ ] Receive `nav.correction` when off-track
- [ ] Ping/pong heartbeat works (every 15 seconds)
- [ ] Connection closes gracefully on disconnect
- [ ] Authentication fails with invalid/expired JWT
- [ ] Rate limiting works (max 10 messages/sec)

---

## Quick Reference

### Production URLs

```
Navigation WebSocket:  wss://api.umrah.app
AI Realtime WebSocket: wss://api.umrah.app/ai/realtime
```

### Development URLs

```
Navigation WebSocket:  ws://localhost:3000
AI Realtime WebSocket: ws://localhost:3000/ai/realtime
```

### Authentication

```
Query param:  ?token=JWT_TOKEN
Header:       Authorization: Bearer JWT_TOKEN
```

### Message Format

```json
{
  "event": "event_name",
  "data": {
    "ts": 1698765432000,
    "seq": 1001,
    ...
  }
}
```

### Rate Limits

- **Client → Server:** 10 messages/second
- **Server → Client:** 5 messages/second
- **Message Queue:** Max 50 messages
- **Heartbeat:** Every 15 seconds

---

## Related Documentation

- **Quran API:** [QURAN_API_DOCUMENTATION.md](./QURAN_API_DOCUMENTATION.md)
- **AI Usage:** [AI_USAGE_DOCUMENTATION.md](./AI_USAGE_DOCUMENTATION.md)
- **Authentication:** [docs/authentication/README.md](./docs/authentication/README.md)
- **Unity Integration:** [docs/UNITY_INTEGRATION_GUIDE.md](./docs/UNITY_INTEGRATION_GUIDE.md)

---

## Support

**Issues:** Report in project tracker

**Questions:** Contact backend development team

**Production URL:** https://api.umrah.app

**Swagger Docs:** https://api.umrah.app/docs

---

**Last Updated:** October 29, 2025

**Backend Version:** 1.0.0

**WebSocket Protocol:** Native WebSocket (RFC 6455)

**Status:** ✅ Navigation WebSocket Active | 🔒 AI WebSocket Disabled (feature flags OFF)
