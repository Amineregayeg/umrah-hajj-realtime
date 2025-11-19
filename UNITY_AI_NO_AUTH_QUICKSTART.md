# Unity AI Integration - No Auth Quick Start

**Updated:** 2025-11-19
**Status:** ✅ Auth Removed for Testing

---

## 🎯 What Changed

**BEFORE:** Required Supabase JWT authentication
**NOW:** Direct access without authentication

This simplifies Unity testing while maintaining all AI voice functionality.

---

## 📋 3-Step Integration (No Auth)

### Step 1: Install Unity Packages

1. **NativeWebSocket**
   - GitHub: https://github.com/endel/NativeWebSocket
   - Install via Package Manager: `com.endel.nativewebsocket`

2. **JSON.NET** (for Unity)
   - Built-in or use Newtonsoft.Json

---

### Step 2: Create AI Session (No Auth Required!)

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;

public class AISessionManager : MonoBehaviour
{
    string backendURL = "https://psychological-jilli-amineregayeg-1fe35444.koyeb.app";

    public IEnumerator CreateSession()
    {
        string url = backendURL + "/ai/realtime/session";

        // Build request body
        var requestBody = new SessionRequest
        {
            language = "en",
            gender = "male",
            ritualType = "umrah",
            userId = "unity-test-" + System.DateTime.Now.Ticks  // Optional
        };

        string json = JsonUtility.ToJson(requestBody);

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            // NO AUTHORIZATION HEADER NEEDED!

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<SessionResponse>(
                    request.downloadHandler.text);

                Debug.Log("Session created: " + response.sessionId);
                Debug.Log("WebSocket URL: " + response.websocketUrl);
                Debug.Log("Ephemeral Token: " + response.ephemeralToken);

                // Connect to WebSocket
                ConnectWebSocket(response.websocketUrl, response.ephemeralToken);
            }
            else
            {
                Debug.LogError("Session creation failed: " + request.error);
                Debug.LogError("Response: " + request.downloadHandler.text);
            }
        }
    }

    [System.Serializable]
    public class SessionRequest
    {
        public string language;
        public string gender;
        public string ritualType;
        public string userId;  // Optional for testing
        public string madhhab;  // Optional
    }

    [System.Serializable]
    public class SessionResponse
    {
        public string sessionId;
        public string websocketUrl;
        public string ephemeralToken;
        public int expiresAt;
        public string voice;
        public string language;
    }
}
```

---

### Step 3: Connect to OpenAI WebSocket

```csharp
using NativeWebSocket;
using UnityEngine;
using System;
using System.Collections;

public class AIVoiceManager : MonoBehaviour
{
    WebSocket websocket;
    AudioSource audioSource;

    void Start()
    {
        audioSource = gameObject.AddComponent<AudioSource>();
    }

    public void ConnectWebSocket(string wsUrl, string ephemeralToken)
    {
        // Add auth token as query parameter
        string authenticatedUrl = wsUrl; // Token already in URL from backend

        websocket = new WebSocket(authenticatedUrl);

        websocket.OnOpen += () =>
        {
            Debug.Log("WebSocket connected to OpenAI!");

            // Optional: Configure session
            SendSessionConfig();
        };

        websocket.OnMessage += (bytes) =>
        {
            string message = System.Text.Encoding.UTF8.GetString(bytes);
            HandleOpenAIMessage(message);
        };

        websocket.OnError += (errorMsg) =>
        {
            Debug.LogError("WebSocket error: " + errorMsg);
        };

        websocket.OnClose += (closeCode) =>
        {
            Debug.Log("WebSocket closed: " + closeCode);
        };

        websocket.Connect();
    }

    void Update()
    {
        // Required: Dispatch WebSocket messages on main thread
        websocket?.DispatchMessageQueue();
    }

    void OnDestroy()
    {
        websocket?.Close();
    }

    void HandleOpenAIMessage(string message)
    {
        Debug.Log("Received: " + message);

        // Parse OpenAI event
        var eventData = JsonUtility.FromJson<OpenAIEvent>(message);

        switch (eventData.type)
        {
            case "session.created":
                Debug.Log("Session ready!");
                break;

            case "response.audio.delta":
                // Play audio chunk
                PlayAudioChunk(eventData.delta);
                break;

            case "response.audio_transcript.delta":
                Debug.Log("User said: " + eventData.delta);
                break;

            case "error":
                Debug.LogError("AI Error: " + message);
                break;
        }
    }

    // Send microphone audio to AI
    public void SendAudio(byte[] pcm16Audio)
    {
        string base64Audio = Convert.ToBase64String(pcm16Audio);

        var audioEvent = new AudioInputEvent
        {
            type = "input_audio_buffer.append",
            audio = base64Audio
        };

        string json = JsonUtility.ToJson(audioEvent);
        websocket.SendText(json);
    }

    // Commit audio buffer (tell AI user finished speaking)
    public void CommitAudio()
    {
        string json = "{\"type\": \"input_audio_buffer.commit\"}";
        websocket.SendText(json);
    }

    void PlayAudioChunk(string base64Audio)
    {
        if (string.IsNullOrEmpty(base64Audio)) return;

        byte[] pcm16 = Convert.FromBase64String(base64Audio);

        // Convert PCM16 to float samples
        float[] samples = new float[pcm16.Length / 2];
        for (int i = 0; i < samples.Length; i++)
        {
            short pcmValue = (short)(pcm16[i * 2] | (pcm16[i * 2 + 1] << 8));
            samples[i] = pcmValue / 32768f;
        }

        // Create and play audio clip
        AudioClip clip = AudioClip.Create("AIResponse", samples.Length, 1, 24000, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void SendSessionConfig()
    {
        // Optional: Update session configuration
        string config = @"{
            ""type"": ""session.update"",
            ""session"": {
                ""turn_detection"": {
                    ""type"": ""server_vad"",
                    ""threshold"": 0.5,
                    ""silence_duration_ms"": 500
                }
            }
        }";

        websocket.SendText(config);
    }

    [System.Serializable]
    public class OpenAIEvent
    {
        public string type;
        public string delta;
        public string text;
    }

    [System.Serializable]
    public class AudioInputEvent
    {
        public string type;
        public string audio;
    }
}
```

---

## 🎤 Recording Microphone Audio

```csharp
using UnityEngine;

public class MicrophoneRecorder : MonoBehaviour
{
    AIVoiceManager voiceManager;
    AudioClip microphoneClip;
    int lastSample = 0;

    void Start()
    {
        voiceManager = GetComponent<AIVoiceManager>();

        // Start recording at 24kHz (required by OpenAI)
        string device = Microphone.devices[0];
        microphoneClip = Microphone.Start(device, true, 1, 24000);
    }

    void Update()
    {
        if (!Microphone.IsRecording(null)) return;

        int currentSample = Microphone.GetPosition(null);
        if (currentSample < lastSample)
        {
            // Microphone wrapped around
            lastSample = 0;
        }

        int sampleCount = currentSample - lastSample;
        if (sampleCount > 0)
        {
            float[] samples = new float[sampleCount];
            microphoneClip.GetData(samples, lastSample);

            // Convert to PCM16
            byte[] pcm16 = new byte[sampleCount * 2];
            for (int i = 0; i < sampleCount; i++)
            {
                short sample = (short)(Mathf.Clamp(samples[i], -1f, 1f) * 32767f);
                pcm16[i * 2] = (byte)(sample & 0xFF);
                pcm16[i * 2 + 1] = (byte)((sample >> 8) & 0xFF);
            }

            // Send to AI
            voiceManager.SendAudio(pcm16);

            lastSample = currentSample;
        }
    }

    void OnDestroy()
    {
        Microphone.End(null);
    }
}
```

---

## 📱 Complete Example Scene Setup

```csharp
using UnityEngine;
using System.Collections;

public class AITestScene : MonoBehaviour
{
    AISessionManager sessionManager;
    AIVoiceManager voiceManager;
    MicrophoneRecorder microphone;

    void Start()
    {
        sessionManager = gameObject.AddComponent<AISessionManager>();
        voiceManager = gameObject.AddComponent<AIVoiceManager>();
        microphone = gameObject.AddComponent<MicrophoneRecorder>();

        // Create session
        StartCoroutine(sessionManager.CreateSession());
    }

    void OnGUI()
    {
        if (GUI.Button(new Rect(10, 10, 200, 50), "Test AI Connection"))
        {
            StartCoroutine(sessionManager.CreateSession());
        }

        GUI.Label(new Rect(10, 70, 500, 20), "Speak into microphone - AI will respond!");
    }
}
```

---

## ⚡ Key Differences from Previous Guide

| Aspect | Before (Auth) | Now (No Auth) |
|--------|---------------|---------------|
| **Supabase Auth** | ✅ Required | ❌ Not needed |
| **JWT Token** | ✅ Required | ❌ Not needed |
| **Authorization Header** | ✅ Required | ❌ Not needed |
| **userId** | From JWT | Optional in body |
| **Setup Time** | 2-3 hours | **15-30 minutes** |

---

## 🚀 Testing Checklist

- [ ] Install NativeWebSocket package
- [ ] Copy AISessionManager script
- [ ] Copy AIVoiceManager script
- [ ] Copy MicrophoneRecorder script
- [ ] Create test scene with AITestScene script
- [ ] Press Play
- [ ] Click "Test AI Connection" button
- [ ] Check Console for "Session created" log
- [ ] Check Console for "WebSocket connected" log
- [ ] Speak into microphone
- [ ] Hear AI voice response

---

## 🔧 Troubleshooting

### Issue: Session creation fails with 400 error

**Solution:** Check that Koyeb environment variable is updated:
- Go to Koyeb dashboard
- Verify `REALTIME_MODEL=gpt-realtime`
- Verify `FEATURE_AI_REALTIME_ENABLED=true`
- Redeploy if needed

### Issue: WebSocket connection fails

**Check:**
1. Session created successfully (check sessionId in logs)
2. ephemeralToken is present and not empty
3. websocketUrl contains valid OpenAI endpoint

### Issue: No audio playing

**Check:**
1. AudioSource component exists on GameObject
2. PCM16 conversion is correct (24kHz sample rate)
3. Audio chunks are not empty (check base64 decoding)

### Issue: Microphone not recording

**Check:**
1. Microphone permissions granted (Player Settings)
2. Microphone device exists (`Microphone.devices.Length > 0`)
3. Sample rate is 24000 (24kHz)

---

## 📊 Expected Behavior

### Successful Flow

```
1. User clicks "Test AI Connection"
   → Console: "Session created: sess_abc123..."

2. WebSocket connects to OpenAI
   → Console: "WebSocket connected to OpenAI!"

3. User speaks: "What are the steps of Umrah?"
   → Console: "User said: What are the steps of Umrah?"

4. AI responds with voice
   → Audio plays through speakers
   → Console: "Received: response.audio.delta"
```

---

## 🔒 Security Notes

**⚠️ IMPORTANT:** This no-auth setup is for **TESTING ONLY**

For production:
1. Re-enable authentication in `ai.controller.ts`
2. Remove `userId` from request body
3. Use Supabase JWT authentication
4. Implement rate limiting
5. Monitor OpenAI API usage

---

## 💰 Cost Estimation

**OpenAI Realtime API Pricing:**
- Audio input: $32/1M tokens
- Audio output: $64/1M tokens

**5-minute conversation:**
- Input: ~15,000 tokens = $0.48
- Output: ~20,000 tokens = $1.28
- **Total: ~$1.76 per 5-minute session**

---

## 📞 Support

**Backend API:**
- URL: https://psychological-jilli-amineregayeg-1fe35444.koyeb.app
- Health: GET /health
- Metrics: GET /metrics/healthz

**Documentation:**
- Full guide: `/UNITY_AI_INTEGRATION_GUIDE.md`
- OpenAI Realtime API: https://platform.openai.com/docs/guides/realtime
- GPT-Realtime Research: `/gpt-realtime-guide-integ.md`

---

**Status:** ✅ Ready for Unity Testing
**Last Updated:** 2025-11-19
**Estimated Integration Time:** 15-30 minutes
