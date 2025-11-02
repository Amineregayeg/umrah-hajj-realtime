# AI Integration Ready - Implementation Checklist

**Date:** 2025-11-02
**Status:** ✅ Backend Ready | ⚠️ Frontend/Unity Integration Pending

---

## ✅ Backend Status: PRODUCTION READY

### 1. OpenAI Configuration ✅
- **API Key:** Configured in Koyeb production environment
- **Model:** `gpt-realtime` (Production GA)
- **Voice:** `verse` (Male, optimized for Arabic)
- **Feature Flags:** All enabled
  - `FEATURE_AI_ENABLED=true`
  - `FEATURE_AI_KNOWLEDGE_SEARCH=true`
  - `FEATURE_AI_REALTIME=true`

### 2. Available Endpoints ✅

#### **A. Voice Realtime Session (PRIMARY ENDPOINT)**
```http
POST https://umrah-hajj-realtime.koyeb.app/ai/realtime/session
Authorization: Bearer <SUPABASE_JWT>
Content-Type: application/json

{
  "language": "en" | "fr" | "ar",
  "gender": "male" | "female",
  "ritualType": "umrah" | "hajj",
  "madhhab": "hanafi" | "shafi" | "maliki" | "hanbali"
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123...",
  "websocketUrl": "wss://api.openai.com/v1/realtime",
  "ephemeralToken": "eph_xyz789...",
  "expiresAt": 1699123456789,
  "voice": "verse",
  "language": "en",
  "model": "gpt-realtime"
}
```

**Status:** ✅ **FULLY IMPLEMENTED AND TESTED**

---

#### **B. Knowledge Search (Text-based Q&A)**
```http
GET https://umrah-hajj-realtime.koyeb.app/content/search?q=<query>&ritual=umrah
```

**Example:**
```http
GET /content/search?q=tawaf&ritual=umrah
```

**Response:**
```json
{
  "results": [
    {
      "content": "Tawaf is the act of circumambulating...",
      "relevance": 0.95,
      "source": "umrah_basics.md"
    }
  ],
  "totalCount": 5
}
```

**Status:** ✅ **READY TO USE**

---

#### **C. Voice Token (Legacy - Optional)**
```http
POST https://umrah-hajj-realtime.koyeb.app/ai/voice/token
Authorization: Bearer <SUPABASE_JWT>
Content-Type: application/json

{
  "ttl": 60,
  "scope": "voice"
}
```

**Status:** ✅ Available (but /ai/realtime/session is recommended)

---

### 3. Knowledge Base ✅

**Available Islamic Content:**
- ✅ `umrah_basics.md` - Complete Umrah rituals and procedures
- ✅ `hajj_steps.md` - Hajj steps and requirements
- ✅ `madhhab_differences.md` - Hanafi, Shafi, Maliki, Hanbali differences
- ✅ `duas_selected.md` - Selected supplications

**Search Method:** Trigram-based indexing (fast, accurate)

---

### 4. AI Features Summary

| Feature | Status | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| **Voice Realtime (Recommended)** | ✅ Ready | POST /ai/realtime/session | ✅ Supabase JWT |
| **Knowledge Search** | ✅ Ready | GET /content/search | ❌ No |
| **Voice Commands** | ✅ Ready | (via realtime WebSocket) | ✅ Yes |
| **Multi-language** | ✅ Ready | (EN, FR, AR) | ✅ Yes |
| **Madhhab-specific** | ✅ Ready | (via session config) | ✅ Yes |
| **Navigation + AI** | ⚠️ Code ready, not connected | - | - |

---

## 🎮 Unity/3D Team - Implementation Tasks

### Task 1: Supabase Authentication Integration ✅ (Already Done?)

**Verify you have:**
- Supabase JWT token retrieval working
- Token stored for API calls
- Token refresh logic implemented

**Docs:** See `/SHARE_WITH_FRONTEND_TEAM.md` and `/PRODUCTION_AUTH_INTEGRATION_GUIDE.md`

---

### Task 2: Voice Realtime Integration (NEW)

#### **Step 2.1: Create AI Voice Session**

**When:** User taps "Start AI Guide" button

**Code Example (Unity C#):**
```csharp
using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections;

public class AIVoiceManager : MonoBehaviour
{
    private string backendUrl = "https://umrah-hajj-realtime.koyeb.app";
    private string supabaseJWT; // From your auth system

    [Serializable]
    public class SessionRequest
    {
        public string language = "en";
        public string gender = "male";
        public string ritualType = "umrah";
        public string madhhab = "hanafi";
    }

    [Serializable]
    public class SessionResponse
    {
        public string sessionId;
        public string websocketUrl;
        public string ephemeralToken;
        public long expiresAt;
        public string voice;
        public string language;
        public string model;
    }

    public IEnumerator CreateAISession(string language, string gender, string ritual)
    {
        // Prepare request
        var request = new SessionRequest
        {
            language = language,
            gender = gender,
            ritualType = ritual,
            madhhab = "hanafi" // Or from user profile
        };

        string jsonBody = JsonUtility.ToJson(request);

        // Create HTTP request
        using (UnityWebRequest www = new UnityWebRequest($"{backendUrl}/ai/realtime/session", "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonBody);
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");
            www.SetRequestHeader("Authorization", $"Bearer {supabaseJWT}");

            yield return www.SendWebRequest();

            if (www.result == UnityWebRequest.Result.Success)
            {
                SessionResponse response = JsonUtility.FromJson<SessionResponse>(www.downloadHandler.text);

                Debug.Log($"Session created! ID: {response.sessionId}");
                Debug.Log($"Model: {response.model}, Voice: {response.voice}");

                // Start WebSocket connection
                StartCoroutine(ConnectToOpenAI(response.websocketUrl, response.ephemeralToken));
            }
            else
            {
                Debug.LogError($"Failed to create session: {www.error}");
                Debug.LogError($"Response: {www.downloadHandler.text}");
            }
        }
    }
}
```

---

#### **Step 2.2: Connect to OpenAI WebSocket**

**Requirements:**
- Unity WebSocket library (e.g., `websocket-sharp` or `NativeWebSocket`)
- PCM16 audio encoding/decoding

**Code Example:**
```csharp
using WebSocketSharp;
using System;
using UnityEngine;

public class OpenAIWebSocketClient : MonoBehaviour
{
    private WebSocket ws;
    private string ephemeralToken;

    public void ConnectToOpenAI(string websocketUrl, string token)
    {
        ephemeralToken = token;

        // Connect to OpenAI Realtime API
        ws = new WebSocket(websocketUrl);

        // Add required headers
        ws.SetCookie(new WebSocketSharp.Net.Cookie("Authorization", $"Bearer {token}"));
        ws.CustomHeaders = new System.Collections.Generic.Dictionary<string, string>
        {
            { "Authorization", $"Bearer {token}" },
            { "OpenAI-Beta", "realtime=v1" }
        };

        ws.OnOpen += OnWebSocketOpen;
        ws.OnMessage += OnWebSocketMessage;
        ws.OnError += OnWebSocketError;
        ws.OnClose += OnWebSocketClose;

        ws.Connect();
    }

    private void OnWebSocketOpen(object sender, EventArgs e)
    {
        Debug.Log("✅ Connected to OpenAI Realtime API!");

        // Session will be auto-configured based on backend settings
        // You can now start sending audio
    }

    private void OnWebSocketMessage(object sender, MessageEventArgs e)
    {
        if (e.IsText)
        {
            Debug.Log($"Received: {e.Data}");
            HandleOpenAIEvent(e.Data);
        }
        else if (e.IsBinary)
        {
            Debug.Log("Received binary audio data");
            // Handle audio playback
        }
    }

    private void HandleOpenAIEvent(string jsonData)
    {
        // Parse OpenAI events
        // Events: session.created, conversation.item.created, response.audio.delta, etc.
        var eventData = JsonUtility.FromJson<OpenAIEvent>(jsonData);

        switch (eventData.type)
        {
            case "session.created":
                Debug.Log("Session ready!");
                break;

            case "conversation.item.created":
                // User or AI spoke
                Debug.Log($"New message: {eventData.item.content}");
                break;

            case "response.audio.delta":
                // AI is speaking - play audio chunk
                PlayAudioChunk(eventData.delta);
                break;

            case "response.function_call_arguments.done":
                // Voice command detected (e.g., "show map")
                HandleVoiceCommand(eventData.name, eventData.arguments);
                break;
        }
    }

    private void OnWebSocketError(object sender, WebSocketSharp.ErrorEventArgs e)
    {
        Debug.LogError($"WebSocket Error: {e.Message}");
    }

    private void OnWebSocketClose(object sender, CloseEventArgs e)
    {
        Debug.Log($"WebSocket Closed: {e.Code} - {e.Reason}");
    }
}
```

---

#### **Step 2.3: Send Audio to OpenAI**

**When:** User is speaking (microphone input)

**Code Example:**
```csharp
public class MicrophoneManager : MonoBehaviour
{
    private AudioClip micClip;
    private int lastSample = 0;
    private WebSocket ws;

    void Start()
    {
        // Start microphone recording
        micClip = Microphone.Start(null, true, 1, 24000); // 24kHz for OpenAI
    }

    void Update()
    {
        if (ws == null || !ws.IsAlive) return;

        // Get new audio samples
        int currentSample = Microphone.GetPosition(null);
        if (currentSample < lastSample)
        {
            // Microphone looped
            currentSample += micClip.samples;
        }

        int samplesToRead = currentSample - lastSample;
        if (samplesToRead > 0)
        {
            float[] samples = new float[samplesToRead];
            micClip.GetData(samples, lastSample % micClip.samples);

            // Convert to PCM16 and send
            byte[] pcm16 = ConvertToPCM16(samples);
            string base64Audio = Convert.ToBase64String(pcm16);

            // Send to OpenAI
            var audioEvent = new
            {
                type = "input_audio_buffer.append",
                audio = base64Audio
            };

            ws.Send(JsonUtility.ToJson(audioEvent));

            lastSample = currentSample;
        }
    }

    private byte[] ConvertToPCM16(float[] floatSamples)
    {
        byte[] pcm16 = new byte[floatSamples.Length * 2];

        for (int i = 0; i < floatSamples.Length; i++)
        {
            short sample = (short)(Mathf.Clamp(floatSamples[i], -1f, 1f) * 32767f);
            pcm16[i * 2] = (byte)(sample & 0xFF);
            pcm16[i * 2 + 1] = (byte)((sample >> 8) & 0xFF);
        }

        return pcm16;
    }
}
```

---

#### **Step 2.4: Play AI Audio Response**

**When:** OpenAI sends audio (AI is speaking)

**Code Example:**
```csharp
public class AudioPlaybackManager : MonoBehaviour
{
    private AudioSource audioSource;
    private Queue<float[]> audioQueue = new Queue<float[]>();

    void Start()
    {
        audioSource = GetComponent<AudioSource>();
    }

    public void PlayAudioChunk(string base64Audio)
    {
        // Decode base64
        byte[] pcm16 = Convert.FromBase64String(base64Audio);

        // Convert PCM16 to float samples
        float[] samples = ConvertPCM16ToFloat(pcm16);

        // Queue for playback
        audioQueue.Enqueue(samples);

        // Start playback if not already playing
        if (!audioSource.isPlaying)
        {
            PlayNextChunk();
        }
    }

    private float[] ConvertPCM16ToFloat(byte[] pcm16)
    {
        float[] samples = new float[pcm16.Length / 2];

        for (int i = 0; i < samples.Length; i++)
        {
            short pcmValue = (short)(pcm16[i * 2] | (pcm16[i * 2 + 1] << 8));
            samples[i] = pcmValue / 32768f;
        }

        return samples;
    }

    private void PlayNextChunk()
    {
        if (audioQueue.Count > 0)
        {
            float[] samples = audioQueue.Dequeue();

            // Create AudioClip and play
            AudioClip clip = AudioClip.Create("AIResponse", samples.Length, 1, 24000, false);
            clip.SetData(samples, 0);

            audioSource.clip = clip;
            audioSource.Play();

            // Schedule next chunk
            StartCoroutine(WaitForClipEnd());
        }
    }

    private IEnumerator WaitForClipEnd()
    {
        yield return new WaitWhile(() => audioSource.isPlaying);
        PlayNextChunk();
    }
}
```

---

#### **Step 2.5: Handle Voice Commands**

**When:** OpenAI detects function call (e.g., "show map")

**Code Example:**
```csharp
public class VoiceCommandHandler : MonoBehaviour
{
    public void HandleVoiceCommand(string functionName, string arguments)
    {
        Debug.Log($"Voice Command: {functionName}({arguments})");

        switch (functionName)
        {
            case "show_timeline":
                // Navigate to timeline screen
                SceneManager.LoadScene("TimelineScene");
                break;

            case "show_map":
                // Navigate to map screen
                SceneManager.LoadScene("MapScene");
                break;

            case "change_language":
                // Parse arguments and change language
                var args = JsonUtility.FromJson<LanguageArgs>(arguments);
                ChangeLanguage(args.language);
                break;

            default:
                Debug.LogWarning($"Unknown command: {functionName}");
                break;
        }
    }

    [Serializable]
    private class LanguageArgs
    {
        public string language;
    }

    private void ChangeLanguage(string lang)
    {
        // Your language switching logic
        Debug.Log($"Changing language to: {lang}");
    }
}
```

---

### Task 3: Knowledge Search Integration (Optional - Text-based)

**When:** User types a question (non-voice)

**Code Example:**
```csharp
public IEnumerator SearchKnowledge(string query, string ritual = "umrah")
{
    string url = $"{backendUrl}/content/search?q={UnityWebRequest.EscapeURL(query)}&ritual={ritual}";

    using (UnityWebRequest www = UnityWebRequest.Get(url))
    {
        yield return www.SendWebRequest();

        if (www.result == UnityWebRequest.Result.Success)
        {
            var response = JsonUtility.FromJson<SearchResponse>(www.downloadHandler.text);

            // Display results in UI
            foreach (var result in response.results)
            {
                Debug.Log($"Answer: {result.content}");
                Debug.Log($"Source: {result.source} (relevance: {result.relevance})");
            }
        }
    }
}

[Serializable]
public class SearchResponse
{
    public SearchResult[] results;
    public int totalCount;
}

[Serializable]
public class SearchResult
{
    public string content;
    public float relevance;
    public string source;
}
```

---

### Task 4: UI Components Needed

**Required UI Elements:**
1. **AI Guide Button**
   - Text: "Start AI Guide" / "بدء الدليل الصوتي"
   - Icon: Microphone
   - State: Inactive, Active (speaking), Listening

2. **Voice Indicator**
   - Visual feedback when user is speaking
   - Visual feedback when AI is speaking
   - Waveform animation (optional)

3. **AI Status Display**
   - "Connecting..."
   - "Ready to speak"
   - "Listening..."
   - "AI is thinking..."
   - "AI is speaking..."

4. **Language Selector** (in settings)
   - English (EN)
   - Français (FR)
   - العربية (AR)

5. **Voice Settings** (in settings)
   - Voice selection (Male/Female)
   - Madhhab selection (Hanafi/Shafi/Maliki/Hanbali)

---

### Task 5: Testing Checklist

**Unity Developer Testing:**
- [ ] Session creation works (receives sessionId, ephemeralToken)
- [ ] WebSocket connects to OpenAI successfully
- [ ] Microphone audio is sent to OpenAI
- [ ] AI audio responses are received and played
- [ ] Voice Activity Detection works (AI responds automatically)
- [ ] Voice commands are detected ("show map" works)
- [ ] Multi-language works (EN, FR, AR)
- [ ] Islamic guidance is accurate (test with real Umrah questions)
- [ ] Madhhab-specific answers are correct
- [ ] Session expires and reconnects properly

---

## 🌐 Web Frontend Team - Implementation Tasks

### Task 1: Authentication ✅ (Same as Unity)

**Requirements:**
- Supabase JWT retrieval
- Token storage (localStorage or sessionStorage)
- Token refresh logic

**Docs:** See `/PRODUCTION_AUTH_INTEGRATION_GUIDE.md`

---

### Task 2: Voice Realtime Integration (Web)

**Option A: WebRTC (Recommended for Web)**

OpenAI now supports WebRTC for web browsers (better than WebSocket for browser audio).

**Code Example (React/TypeScript):**
```typescript
import { useEffect, useRef, useState } from 'react';

export function useOpenAIRealtime() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  async function startSession(supabaseJWT: string) {
    setStatus('connecting');

    // 1. Create session with backend
    const response = await fetch('https://umrah-hajj-realtime.koyeb.app/ai/realtime/session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseJWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: 'en',
        gender: 'male',
        ritualType: 'umrah',
      }),
    });

    const session = await response.json();

    // 2. Create WebRTC connection to OpenAI
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // Add microphone track
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Create data channel for events
    const dc = pc.createDataChannel('oai-events');
    dataChannelRef.current = dc;

    dc.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('OpenAI event:', data);

      // Handle events (transcription, function calls, etc.)
      if (data.type === 'response.function_call_arguments.done') {
        handleVoiceCommand(data.name, data.arguments);
      }
    };

    // 3. Create and send SDP offer to OpenAI
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-realtime`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.ephemeralToken}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    const answerSDP = await sdpResponse.text();
    await pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSDP,
    });

    setStatus('connected');
  }

  function handleVoiceCommand(name: string, args: any) {
    switch (name) {
      case 'show_timeline':
        window.location.href = '/timeline';
        break;
      case 'show_map':
        window.location.href = '/map';
        break;
    }
  }

  function stopSession() {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    setStatus('idle');
  }

  return { startSession, stopSession, status };
}
```

**Usage in React Component:**
```tsx
function AIGuideButton() {
  const { startSession, stopSession, status } = useOpenAIRealtime();
  const { supabaseJWT } = useAuth(); // Your auth hook

  return (
    <button
      onClick={() => status === 'idle' ? startSession(supabaseJWT) : stopSession()}
      disabled={status === 'connecting'}
    >
      {status === 'idle' && '🎤 Start AI Guide'}
      {status === 'connecting' && '⏳ Connecting...'}
      {status === 'connected' && '🔴 Stop AI Guide'}
    </button>
  );
}
```

---

**Option B: WebSocket (Alternative)**

If you prefer WebSocket (similar to Unity):

```typescript
export function useOpenAIWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null);

  async function startSession(supabaseJWT: string) {
    // 1. Get session from backend
    const response = await fetch('https://umrah-hajj-realtime.koyeb.app/ai/realtime/session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseJWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language: 'en', gender: 'male', ritualType: 'umrah' }),
    });

    const session = await response.json();

    // 2. Connect to OpenAI WebSocket
    const websocket = new WebSocket(session.websocketUrl);

    websocket.onopen = () => {
      console.log('✅ Connected to OpenAI');

      // Send session configuration
      websocket.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: session.voice,
        },
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('OpenAI event:', data);

      // Handle audio chunks
      if (data.type === 'response.audio.delta') {
        playAudioChunk(data.delta);
      }
    };

    setWs(websocket);

    // 3. Start sending microphone audio
    startMicrophone(websocket);
  }

  async function startMicrophone(ws: WebSocket) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: 24000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const audioData = event.inputBuffer.getChannelData(0);

      // Convert to PCM16
      const pcm16 = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
      }

      // Send to OpenAI
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      }));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }

  function playAudioChunk(base64Audio: string) {
    // Decode and play audio
    const audioData = atob(base64Audio);
    // ... (audio playback logic)
  }

  return { startSession, ws };
}
```

---

### Task 3: UI Components (Web)

**React Component Example:**
```tsx
function AIVoiceGuide() {
  const { startSession, stopSession, status } = useOpenAIRealtime();
  const { user, jwt } = useSupabaseAuth();

  return (
    <div className="ai-voice-guide">
      <button
        onClick={() => startSession(jwt)}
        disabled={status !== 'idle'}
        className="ai-start-button"
      >
        <MicrophoneIcon />
        <span>Start AI Guide</span>
      </button>

      {status === 'connected' && (
        <div className="ai-status">
          <div className="ai-listening-indicator">
            <div className="pulse-animation" />
            <span>Listening...</span>
          </div>

          <button onClick={stopSession} className="ai-stop-button">
            Stop
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## ⚠️ Backend Tasks (Minor - Optional Enhancements)

### Task 1: Connect Navigation + AI (Optional)

**Current Status:** Code exists in `src/ai/handlers/navigation-ai-handler.ts` but not connected to WebSocket.

**What it does:**
- Sends location-aware AI guidance during navigation
- Example: "You're approaching Hajar al-Aswad. Prepare to start Tawaf from here."

**To Enable:**
1. Import NavigationAIHandler in `nav.gateway.ts`
2. Call handler when user position changes
3. Send AI guidance via WebSocket

**Priority:** Low (can wait for v2)

---

## 📊 Feature Comparison

| Feature | Backend Status | Unity Status | Web Status | Priority |
|---------|---------------|--------------|------------|----------|
| **Voice Realtime** | ✅ Ready | ⚠️ Needs implementation | ⚠️ Needs implementation | 🔴 High |
| **Knowledge Search** | ✅ Ready | ⚠️ Needs implementation | ⚠️ Needs implementation | 🟡 Medium |
| **Voice Commands** | ✅ Ready | ⚠️ Needs implementation | ⚠️ Needs implementation | 🔴 High |
| **Multi-language** | ✅ Ready | ⚠️ Needs implementation | ⚠️ Needs implementation | 🔴 High |
| **Madhhab-specific** | ✅ Ready | ⚠️ Needs implementation | ⚠️ Needs implementation | 🟡 Medium |
| **Navigation + AI** | ⚠️ Code ready, not connected | N/A | N/A | 🟢 Low |

---

## 🎯 Recommended Implementation Order

### Phase 1: Core Voice (Week 1-2)
1. Unity: Implement session creation
2. Unity: Implement WebSocket connection
3. Unity: Implement audio send/receive
4. Unity: Test with basic voice interaction

### Phase 2: Voice Commands (Week 2-3)
1. Unity: Implement voice command handling
2. Unity: Test "show map", "show timeline" commands
3. Web: Start WebRTC/WebSocket implementation

### Phase 3: Multi-language & Madhhab (Week 3-4)
1. Unity: Add language selector UI
2. Unity: Add madhhab selector UI
3. Test all language combinations
4. Test madhhab-specific guidance accuracy

### Phase 4: Polish & Testing (Week 4-5)
1. UI/UX improvements
2. Error handling
3. Session reconnection logic
4. Production testing with real users

---

## 📚 Documentation Links

**For Unity Team:**
- `/PRODUCTION_AUTH_INTEGRATION_GUIDE.md` - Supabase authentication
- `/SHARE_WITH_FRONTEND_TEAM.md` - Quick start guide
- `/OPENAI_CONFIGURATION_COMPLETE.md` - Backend AI config details
- `/RECOMMENDED_MODEL_UPDATE.md` - Model details and capabilities

**For Web Team:**
- Same as Unity, plus:
- OpenAI Realtime WebRTC Docs: https://platform.openai.com/docs/guides/realtime
- WebRTC Guide: https://platform.openai.com/docs/guides/realtime-webrtc

**Backend Team:**
- `/AI_SYSTEM_STATUS_REPORT.md` - Complete AI system documentation
- `/NAVIGATION_SYSTEM_TECHNICAL_REPORT.md` - Navigation + GPS details

---

## ✅ Production Checklist

### Backend (Complete ✅)
- [x] OpenAI API key configured
- [x] Model set to gpt-realtime
- [x] Feature flags enabled
- [x] Endpoints deployed and tested
- [x] Knowledge base indexed
- [x] Authentication working

### Unity Team (Pending ⚠️)
- [ ] Session creation implemented
- [ ] WebSocket connection working
- [ ] Audio send/receive working
- [ ] Voice commands detected
- [ ] UI components created
- [ ] Multi-language tested
- [ ] Production testing complete

### Web Team (Pending ⚠️)
- [ ] WebRTC or WebSocket implemented
- [ ] Audio handling working
- [ ] UI components created
- [ ] Voice commands working
- [ ] Production testing complete

---

## 🆘 Support & Questions

**Backend Issues:**
- Check logs: Koyeb dashboard → Logs
- Verify environment variables are set
- Test endpoints with curl/Postman

**Unity/Web Issues:**
- Verify Supabase JWT is valid
- Check CORS (should be configured for your domains)
- Test with curl first before implementing in app

**AI Quality Issues:**
- Try different voices (verse, coral, cedar, marin)
- Adjust language or madhhab settings
- Check if question is in knowledge base

---

**Created:** 2025-11-02
**Status:** Backend ✅ READY | Frontend ⚠️ PENDING IMPLEMENTATION
**Next Action:** Unity/Web teams start Phase 1 implementation
