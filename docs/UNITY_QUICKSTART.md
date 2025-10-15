# Unity Quickstart Guide

Get started with the Umrah Hajj Real-time API in under 5 minutes.

## Prerequisites

- Unity 2020.3 or later
- WebSocket library (e.g., `WebSocketSharp`, `NativeWebSocket`, or Unity's built-in)
- JWT authentication token (or use mock mode for testing)

## Step 1: Connect to WebSocket

```csharp
using UnityEngine;
using WebSocketSharp; // or your preferred WebSocket library

public class QuickStartNav : MonoBehaviour
{
    private WebSocket ws;
    private string apiUrl = "wss://YOUR_APP.koyeb.app/ws";
    private string jwtToken = "mock_user_token_123"; // Use real JWT in production

    void Start()
    {
        // Connect with JWT token in query parameter
        string wsUrl = $"{apiUrl}?token={jwtToken}";
        ws = new WebSocket(wsUrl);

        ws.OnOpen += (sender, e) => {
            Debug.Log("✅ Connected to navigation API");
        };

        ws.OnMessage += (sender, e) => {
            Debug.Log($"📩 Received: {e.Data}");
            // Handle messages here (see Step 3)
        };

        ws.OnError += (sender, e) => {
            Debug.LogError($"❌ WebSocket error: {e.Message}");
        };

        ws.OnClose += (sender, e) => {
            Debug.Log($"🔌 Disconnected: {e.Code} {e.Reason}");
        };

        ws.Connect();
    }

    void OnDestroy()
    {
        ws?.Close();
    }
}
```

**Replace**:
- `YOUR_APP` with your actual Koyeb app name
- `mock_user_token_123` with real JWT in production (or keep for staging)

## Step 2: Send Location Updates

Send your user's position every 100ms (max 10 Hz):

```csharp
using System;

private float updateInterval = 0.1f; // 100ms = 10 Hz
private float lastUpdateTime = 0f;

void Update()
{
    if (Time.time - lastUpdateTime >= updateInterval)
    {
        SendLocationUpdate();
        lastUpdateTime = Time.time;
    }
}

void SendLocationUpdate()
{
    if (ws == null || ws.ReadyState != WebSocketState.Open) return;

    // Get user's current position (replace with your GPS/positioning system)
    float latitude = 21.4225f;  // Example: Near Kaaba
    float longitude = 39.8262f;
    float heading = 90.0f;      // Compass bearing (0=N, 90=E, 180=S, 270=W)

    var message = new
    {
        type = "nav.update",
        timestamp = DateTime.UtcNow.ToString("o"),
        payload = new
        {
            userId = "user_123", // Replace with actual user ID
            location = new
            {
                latitude = latitude,
                longitude = longitude,
                accuracy = 1.5f, // GPS accuracy in meters
                floor = 0        // Floor level (0=ground)
            },
            heading = heading,
            routeId = "route_makkah_kaaba", // Active route ID
            currentSegmentIndex = 0
        }
    };

    string json = JsonUtility.ToJson(message);
    ws.Send(json);
}
```

## Step 3: Handle Navigation Corrections

Receive and process guidance from the server:

```csharp
[System.Serializable]
public class WebSocketMessage
{
    public string type;
    public string timestamp;
    public Payload payload;
}

[System.Serializable]
public class Payload
{
    public string userId;
    public string correctionType;
    public Location currentLocation;
    public Location targetLocation;
    public float distance;
    public float bearing;
    public string message;
}

[System.Serializable]
public class Location
{
    public float latitude;
    public float longitude;
    public int floor;
}

void OnMessage(object sender, MessageEventArgs e)
{
    var message = JsonUtility.FromJson<WebSocketMessage>(e.Data);

    switch (message.type)
    {
        case "nav.correction":
            HandleNavCorrection(message.payload);
            break;
        case "ai.prompt":
            HandleAIPrompt(message.payload);
            break;
        case "ui.banner":
            HandleUIBanner(message.payload);
            break;
        case "state.set":
            HandleStateSet(message.payload);
            break;
        default:
            Debug.LogWarning($"Unknown message type: {message.type}");
            break;
    }
}

void HandleNavCorrection(Payload payload)
{
    Debug.Log($"🧭 Navigation correction: {payload.message}");
    Debug.Log($"   Distance to target: {payload.distance}m");
    Debug.Log($"   Bearing: {payload.bearing}°");

    // Update your UI/3D navigation here
    // Example: Show arrow pointing to target
    // Example: Display text instruction
}

void HandleAIPrompt(Payload payload)
{
    Debug.Log($"🎙️ AI prompt received: {payload.message}");
    // Play audio from payload.audioUrl
    // Display transcript if audio unavailable
}

void HandleUIBanner(Payload payload)
{
    Debug.Log($"📢 Banner: {payload.message}");
    // Show banner UI with payload.severity styling
}

void HandleStateSet(Payload payload)
{
    Debug.Log($"⚙️ State update: {payload.stateKey} = {payload.stateValue}");
    // Update application state
}
```

## Step 4: Test Your Integration

### Using Mock Mode (Staging)

1. Set `AUTH_MODE=mock` in API environment variables
2. Use token: `mock_user_token_123`
3. Connect and send `nav.update` messages
4. Watch Unity console for navigation corrections

### Using Real Auth

1. Obtain JWT from Supabase or your auth provider
2. Set `AUTH_MODE=supabase` in API (production)
3. Replace `mock_user_token_123` with real JWT
4. Implement JWT refresh logic (tokens expire)

## Optional: Enable MessagePack (Binary Protocol)

For smaller payloads and faster serialization:

1. Set `ENABLE_MSGPACK=true` in API environment variables
2. Install MessagePack for C#: `dotnet add package MessagePack`
3. Update message handling:

```csharp
using MessagePack;

ws.OnMessage += (sender, e) => {
    if (e.IsBinary) {
        var message = MessagePackSerializer.Deserialize<WebSocketMessage>(e.RawData);
        HandleMessage(message);
    }
};

// Send with MessagePack
var message = new WebSocketMessage { /* ... */ };
byte[] bytes = MessagePackSerializer.Serialize(message);
ws.Send(bytes);
```

## Common Pitfalls

### 1. Sending Too Fast

**Problem**: Server drops messages, connection throttled

**Solution**: Limit updates to ≤10 Hz (100ms interval):
```csharp
private const float MIN_UPDATE_INTERVAL = 0.1f; // 100ms
```

### 2. Forgetting JWT Token

**Problem**: WebSocket connection rejected (401/403)

**Solution**: Always include `?token=YOUR_JWT` in WebSocket URL

### 3. Origin Mismatch

**Problem**: Connection rejected despite valid token

**Solution**: Ensure API's `WS_ORIGIN` matches your client's origin exactly

### 4. Not Handling Disconnects

**Problem**: App stops working after network interruption

**Solution**: Implement reconnection with exponential backoff (see [Unity Integration Guide](./UNITY_INTEGRATION_GUIDE.md))

## Next Steps

- **Full Integration Guide**: [UNITY_INTEGRATION_GUIDE.md](./UNITY_INTEGRATION_GUIDE.md)
- **API Documentation**: `https://YOUR_APP.koyeb.app/docs`
- **Environment Variables**: [API_ENV_VARS.md](./API_ENV_VARS.md)
- **REST Endpoints**: Use for prayer times, Qibla, Quran content (see [Unity Integration Guide](./UNITY_INTEGRATION_GUIDE.md))

## Example REST API Calls from Unity

### Get Prayer Times

```csharp
using UnityEngine.Networking;
using System.Collections;

IEnumerator GetPrayerTimes(float lat, float lng)
{
    string url = $"https://YOUR_APP.koyeb.app/content/prayer-times?lat={lat}&lng={lng}";

    using (UnityWebRequest request = UnityWebRequest.Get(url))
    {
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            string json = request.downloadHandler.text;
            Debug.Log($"Prayer times: {json}");
            // Parse JSON and display in UI
        }
        else
        {
            Debug.LogError($"Prayer times request failed: {request.error}");
        }
    }
}
```

### Get Qibla Direction

```csharp
IEnumerator GetQiblaDirection(float lat, float lng)
{
    string url = $"https://YOUR_APP.koyeb.app/content/qibla?lat={lat}&lng={lng}";

    using (UnityWebRequest request = UnityWebRequest.Get(url))
    {
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            string json = request.downloadHandler.text;
            var response = JsonUtility.FromJson<QiblaResponse>(json);
            Debug.Log($"Qibla direction: {response.qibla.direction}°");
            Debug.Log($"Distance to Kaaba: {response.qibla.distance} km");
            // Rotate Qibla compass in UI
        }
    }
}

[System.Serializable]
public class QiblaResponse
{
    public QiblaData qibla;
}

[System.Serializable]
public class QiblaData
{
    public float direction; // Degrees (0-360)
    public float distance;  // Kilometers
}
```

## Support

- **Issues**: https://github.com/YOUR_ORG/umrah-hajj-realtime/issues
- **Detailed Docs**: [UNITY_INTEGRATION_GUIDE.md](./UNITY_INTEGRATION_GUIDE.md)
- **API Reference**: `https://YOUR_APP.koyeb.app/docs`

Happy coding! 🚀
