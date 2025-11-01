# Unity Frontend - Supabase Authentication Integration Guide

**Backend API:** `https://api.umrah.app`
**Supabase Project:** `https://qtrgbxuvjlblgkolgvxx.supabase.co`
**Status:** ✅ Production Ready
**Auth Mode:** Supabase (Mock tokens disabled)

---

## 🎯 Quick Start for Unity Developers

### What Changed
- ❌ **OLD:** Mock authentication (`dummy-jwt-*` tokens)
- ✅ **NEW:** Real Supabase authentication with JWT tokens

### What You Need
1. Install Supabase Unity SDK
2. Configure Supabase client
3. Implement user registration/login
4. Use JWT tokens with backend API calls

---

## 📦 Step 1: Install Supabase Unity SDK

### Option A: Using Unity Package Manager (Recommended)

```
1. Open Unity Editor
2. Window → Package Manager
3. Click "+" → Add package from git URL
4. Enter: https://github.com/supabase-community/supabase-unity.git
```

### Option B: Manual Installation

Download from: https://github.com/supabase-community/supabase-unity/releases

---

## ⚙️ Step 2: Configure Supabase Client

Create a new C# script: `SupabaseManager.cs`

```csharp
using UnityEngine;
using Supabase;
using System;
using System.Threading.Tasks;

public class SupabaseManager : MonoBehaviour
{
    private static SupabaseManager _instance;
    public static SupabaseManager Instance => _instance;

    private Client supabaseClient;

    // Supabase Configuration
    private const string SUPABASE_URL = "https://qtrgbxuvjlblgkolgvxx.supabase.co";
    private const string SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmdieHV2amxibGdrb2xndnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkxMzksImV4cCI6MjA3NzU5NTEzOX0.MZTqMkE9TcerxmmAhJ_irL-v_YsXrp8B26alMGpWQi4";

    void Awake()
    {
        if (_instance == null)
        {
            _instance = this;
            DontDestroyOnLoad(gameObject);
            InitializeSupabase();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private async void InitializeSupabase()
    {
        var options = new SupabaseOptions
        {
            AutoRefreshToken = true,
            AutoConnectRealtime = false
        };

        supabaseClient = new Client(SUPABASE_URL, SUPABASE_ANON_KEY, options);
        await supabaseClient.InitializeAsync();

        Debug.Log("✅ Supabase initialized successfully");
    }

    public Client GetClient()
    {
        return supabaseClient;
    }

    // Get current user's JWT token
    public string GetAccessToken()
    {
        if (supabaseClient?.Auth?.CurrentSession != null)
        {
            return supabaseClient.Auth.CurrentSession.AccessToken;
        }

        Debug.LogWarning("⚠️ No active session - user not logged in");
        return null;
    }

    // Check if user is logged in
    public bool IsLoggedIn()
    {
        return supabaseClient?.Auth?.CurrentUser != null;
    }
}
```

---

## 🔐 Step 3: Implement User Registration

Create `AuthManager.cs`:

```csharp
using UnityEngine;
using Supabase.Gotrue;
using System.Threading.Tasks;

public class AuthManager : MonoBehaviour
{
    // Call this from your registration UI
    public async Task<bool> RegisterUser(string email, string password)
    {
        try
        {
            var client = SupabaseManager.Instance.GetClient();

            var session = await client.Auth.SignUp(email, password);

            if (session?.User != null)
            {
                Debug.Log($"✅ User registered: {session.User.Email}");
                Debug.Log($"✅ JWT Token: {session.AccessToken}");
                return true;
            }
            else
            {
                Debug.LogError("❌ Registration failed - no session returned");
                return false;
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"❌ Registration error: {e.Message}");
            return false;
        }
    }

    // Call this from your login UI
    public async Task<bool> LoginUser(string email, string password)
    {
        try
        {
            var client = SupabaseManager.Instance.GetClient();

            var session = await client.Auth.SignIn(email, password);

            if (session?.User != null)
            {
                Debug.Log($"✅ User logged in: {session.User.Email}");
                Debug.Log($"✅ JWT Token: {session.AccessToken}");
                return true;
            }
            else
            {
                Debug.LogError("❌ Login failed - invalid credentials");
                return false;
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"❌ Login error: {e.Message}");
            return false;
        }
    }

    // Logout
    public async Task LogoutUser()
    {
        try
        {
            var client = SupabaseManager.Instance.GetClient();
            await client.Auth.SignOut();
            Debug.Log("✅ User logged out");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"❌ Logout error: {e.Message}");
        }
    }
}
```

---

## 🌐 Step 4: Call Backend APIs with JWT Token

Create `BackendAPIManager.cs`:

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Threading.Tasks;
using System.Text;

public class BackendAPIManager : MonoBehaviour
{
    private const string API_BASE_URL = "https://api.umrah.app";

    // Example: Get voice token for AI features
    public async Task<VoiceTokenResponse> GetVoiceToken(string language, string gender)
    {
        // Get JWT token from Supabase
        string jwtToken = SupabaseManager.Instance.GetAccessToken();

        if (string.IsNullOrEmpty(jwtToken))
        {
            Debug.LogError("❌ No JWT token - user must be logged in");
            return null;
        }

        string url = $"{API_BASE_URL}/ai/voice/token";

        var requestData = new VoiceTokenRequest
        {
            language = language,
            gender = gender
        };

        string jsonData = JsonUtility.ToJson(requestData);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();

            // CRITICAL: Add JWT token to Authorization header
            request.SetRequestHeader("Authorization", $"Bearer {jwtToken}");
            request.SetRequestHeader("Content-Type", "application/json");

            var operation = request.SendWebRequest();

            while (!operation.isDone)
                await Task.Yield();

            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log($"✅ Voice token received");
                return JsonUtility.FromJson<VoiceTokenResponse>(request.downloadHandler.text);
            }
            else
            {
                Debug.LogError($"❌ API Error: {request.error}");
                Debug.LogError($"❌ Response: {request.downloadHandler.text}");
                return null;
            }
        }
    }

    // Example: Get Quran surah (public endpoint - no auth required)
    public async Task<QuranSurahResponse> GetQuranSurah(int surahNumber)
    {
        string url = $"{API_BASE_URL}/content/quran/surah/{surahNumber}";

        using (UnityWebRequest request = UnityWebRequest.Get(url))
        {
            request.SetRequestHeader("Accept", "application/json");

            var operation = request.SendWebRequest();

            while (!operation.isDone)
                await Task.Yield();

            if (request.result == UnityWebRequest.Result.Success)
            {
                return JsonUtility.FromJson<QuranSurahResponse>(request.downloadHandler.text);
            }
            else
            {
                Debug.LogError($"❌ API Error: {request.error}");
                return null;
            }
        }
    }
}

// Data models
[System.Serializable]
public class VoiceTokenRequest
{
    public string language;
    public string gender;
}

[System.Serializable]
public class VoiceTokenResponse
{
    public string token;
    public long expiresAt;
    public int ttl;
    public string[] scope;
    public string language;
    public string gender;
}

[System.Serializable]
public class QuranSurahResponse
{
    public int number;
    public string name;
    public string englishName;
    public int numberOfAyahs;
    // Add more fields as needed
}
```

---

## 🔌 Step 5: WebSocket Connection with JWT

For real-time navigation features:

```csharp
using UnityEngine;
using NativeWebSocket;
using System.Threading.Tasks;

public class NavigationWebSocketManager : MonoBehaviour
{
    private WebSocket websocket;
    private const string WS_URL = "wss://api.umrah.app";

    public async Task ConnectToNavigation()
    {
        // Get JWT token
        string jwtToken = SupabaseManager.Instance.GetAccessToken();

        if (string.IsNullOrEmpty(jwtToken))
        {
            Debug.LogError("❌ Cannot connect - user not logged in");
            return;
        }

        // Create WebSocket connection with JWT in URL
        string wsUrlWithAuth = $"{WS_URL}?token={jwtToken}";

        websocket = new WebSocket(wsUrlWithAuth);

        websocket.OnOpen += () =>
        {
            Debug.Log("✅ WebSocket connected!");
        };

        websocket.OnMessage += (bytes) =>
        {
            var message = System.Text.Encoding.UTF8.GetString(bytes);
            Debug.Log($"📨 Received: {message}");
            // Handle navigation updates here
        };

        websocket.OnError += (error) =>
        {
            Debug.LogError($"❌ WebSocket Error: {error}");
        };

        websocket.OnClose += (code) =>
        {
            Debug.Log($"🔌 WebSocket closed: {code}");
        };

        await websocket.Connect();
    }

    void Update()
    {
        #if !UNITY_WEBGL || UNITY_EDITOR
        websocket?.DispatchMessageQueue();
        #endif
    }

    private async void OnApplicationQuit()
    {
        if (websocket != null)
        {
            await websocket.Close();
        }
    }
}
```

---

## 🎮 Step 6: Example Login UI Integration

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class LoginUIController : MonoBehaviour
{
    [SerializeField] private TMP_InputField emailInput;
    [SerializeField] private TMP_InputField passwordInput;
    [SerializeField] private Button loginButton;
    [SerializeField] private Button registerButton;
    [SerializeField] private TextMeshProUGUI statusText;

    private AuthManager authManager;

    void Start()
    {
        authManager = GetComponent<AuthManager>();

        loginButton.onClick.AddListener(OnLoginClicked);
        registerButton.onClick.AddListener(OnRegisterClicked);
    }

    private async void OnLoginClicked()
    {
        string email = emailInput.text;
        string password = passwordInput.text;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
        {
            statusText.text = "Please enter email and password";
            return;
        }

        statusText.text = "Logging in...";
        loginButton.interactable = false;

        bool success = await authManager.LoginUser(email, password);

        if (success)
        {
            statusText.text = "✅ Login successful!";
            // Navigate to main game scene
            // SceneManager.LoadScene("MainGame");
        }
        else
        {
            statusText.text = "❌ Login failed - check credentials";
            loginButton.interactable = true;
        }
    }

    private async void OnRegisterClicked()
    {
        string email = emailInput.text;
        string password = passwordInput.text;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
        {
            statusText.text = "Please enter email and password";
            return;
        }

        if (password.Length < 6)
        {
            statusText.text = "Password must be at least 6 characters";
            return;
        }

        statusText.text = "Registering...";
        registerButton.interactable = false;

        bool success = await authManager.RegisterUser(email, password);

        if (success)
        {
            statusText.text = "✅ Registration successful! Please check email to confirm.";
        }
        else
        {
            statusText.text = "❌ Registration failed";
            registerButton.interactable = true;
        }
    }
}
```

---

## 📚 Available API Endpoints

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/content/quran/surahs` | List all surahs |
| GET | `/content/quran/surah/:number` | Get specific surah |
| GET | `/content/quran/ayah/:surah/:ayah` | Get specific ayah |
| GET | `/content/quran/juz/:number` | Get specific juz |
| POST | `/content/quran/search` | Search Quran |

### Protected Endpoints (Require JWT Token)

| Method | Endpoint | Description | Required Headers |
|--------|----------|-------------|------------------|
| POST | `/ai/voice/token` | Get AI voice token | `Authorization: Bearer <JWT>` |
| WebSocket | `wss://api.umrah.app` | Real-time navigation | `?token=<JWT>` in URL |

---

## ✅ Testing Checklist

### 1. Test User Registration
```csharp
// In Unity Editor - attach to a GameObject and call from UI
await authManager.RegisterUser("test@example.com", "testpassword123");
// Expected: Success message + JWT token in logs
```

### 2. Test User Login
```csharp
await authManager.LoginUser("test@example.com", "testpassword123");
// Expected: Success message + JWT token in logs
```

### 3. Test Protected Endpoint
```csharp
var voiceToken = await apiManager.GetVoiceToken("ar", "male");
// Expected: Voice token object returned
```

### 4. Test Public Endpoint
```csharp
var surah = await apiManager.GetQuranSurah(1);
// Expected: Surah data returned (works without login)
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Use the **SUPABASE_ANON_KEY** in your Unity app (it's safe to expose)
- Store user sessions securely
- Validate email format before registration
- Enforce minimum password length (6+ characters)
- Handle token expiration gracefully (auto-refresh is enabled)

### ❌ DON'T:
- **NEVER** use `SUPABASE_SERVICE_ROLE_KEY` in Unity (backend only!)
- **NEVER** use `SUPABASE_JWT_SECRET` in Unity (backend only!)
- Don't store passwords in PlayerPrefs
- Don't log JWT tokens in production builds

---

## 🆘 Troubleshooting

### Issue: "No JWT token - user not logged in"
**Cause:** Trying to call protected endpoint before login
**Fix:** Ensure user is logged in before calling protected APIs

```csharp
if (!SupabaseManager.Instance.IsLoggedIn())
{
    Debug.LogError("User must be logged in");
    // Show login screen
    return;
}
```

### Issue: "401 Unauthorized" from backend
**Cause:** JWT token expired or invalid
**Fix:** Re-login user

```csharp
// Auto-refresh is enabled, but if it fails, prompt re-login
if (response.responseCode == 401)
{
    Debug.LogWarning("Token expired - please login again");
    await authManager.LogoutUser();
    // Show login screen
}
```

### Issue: "Invalid credentials" during login
**Cause:** Wrong email/password or user not confirmed
**Fix:** Check Supabase dashboard → Authentication → Users for email confirmation status

### Issue: WebSocket connection fails
**Cause:** JWT token not included in connection
**Fix:** Ensure `?token=<JWT>` is in WebSocket URL

---

## 📖 Additional Resources

- **Supabase Unity SDK:** https://github.com/supabase-community/supabase-unity
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **Backend API Docs:** `QURAN_API_DOCUMENTATION.md`, `AI_USAGE_DOCUMENTATION.md`
- **WebSocket Testing Guide:** `WEBSOCKET_ENDPOINTS.md`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/qtrgbxuvjlblgkolgvxx

---

## 🎯 Summary

**What Frontend Team Needs to Do:**

1. ✅ Install Supabase Unity SDK
2. ✅ Copy `SupabaseManager.cs` and configure with provided credentials
3. ✅ Implement `AuthManager.cs` for login/registration
4. ✅ Create login/registration UI
5. ✅ Use JWT tokens when calling protected backend endpoints
6. ✅ Test with real user accounts

**What's Ready on Backend:**

- ✅ Supabase authentication fully configured
- ✅ Mock tokens disabled (security enabled)
- ✅ JWT validation working
- ✅ All endpoints ready for production
- ✅ WebSocket authentication enabled

---

**Created:** 2025-11-01
**Status:** ✅ Production Ready
**Backend URL:** https://api.umrah.app
**Supabase Project:** qtrgbxuvjlblgkolgvxx
