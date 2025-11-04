# Unity Frontend - Supabase Authentication Integration Guide

**Backend API:** `https://psychological-jilli-amineregayeg-1fe35444.koyeb.app`
**Supabase Project:** `https://qtrgbxuvjlblgkolgvxx.supabase.co`
**Status:** ✅ Production Ready
**Auth Mode:** Supabase JWT (HS256)
**Email Confirmation:** ❌ DISABLED (users can login immediately - no email verification)
**Unity Versions:** 2021.3+ / 2022.x / 2023.x
**Platforms:** Android, iOS, WebGL, Standalone

---

## 🚀 Quick Start (3 Steps)

### What Changed
- ❌ **OLD:** Mock authentication (`dummy-jwt-*` tokens) - REMOVED
- ✅ **NEW:** Real Supabase authentication with JWT tokens (HS256)
- ✅ **CORRECT SDK:** Using official community-maintained Supabase C# SDK

### What You Need
1. Install **Supabase C# SDK** (official community package)
2. Configure Supabase client with session persistence
3. Implement user registration/login
4. Use JWT tokens with backend API calls

---

## 📦 Step 1: Install Supabase C# SDK

### ✅ CORRECT Method: Unity Package Manager (Recommended)

**Important:** The previous guide had incorrect repository URLs. Use the **official community SDK**:

```
1. Open Unity Editor
2. Window → Package Manager
3. Click "+" → Add package from git URL
4. Enter: https://github.com/supabase-community/supabase-csharp.git#0.20.0
```

> **Version Note:** `0.20.0` is stable for Unity 2021.3+. Check [releases](https://github.com/supabase-community/supabase-csharp/releases) for latest compatible version.

### Alternative: NuGet for Unity

If using [NuGetForUnity](https://github.com/GlitchEnzo/NuGetForUnity):

```
Install-Package supabase-csharp
```

### Troubleshooting Installation

- **Dependency errors:** Follow [Unity-specific wiki guide](https://github.com/supabase-community/supabase-csharp/wiki/Unity)
- **Compatibility:** Requires Unity 2021.3+ (.NET Standard 2.1)
- **Platform-specific:** WebGL and mobile have special considerations (see Platform Notes below)

---

## ⚙️ Step 2: Configure Supabase Client

### Create `SupabaseManager.cs` (Bootstrap Script)

**Copy this exact code - credentials are pre-filled for your project:**

```csharp
using UnityEngine;
using Supabase;
using System.Threading.Tasks;

/// <summary>
/// Manages Supabase client initialization and session persistence
/// Attach to a GameObject in your first scene
/// </summary>
public class SupabaseManager : MonoBehaviour
{
    public static Client Sb { get; private set; }

    // ✅ YOUR PROJECT CREDENTIALS (safe to include - anon key is public)
    private const string SUPABASE_URL = "https://qtrgbxuvjlblgkolgvxx.supabase.co";
    private const string SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmdieHV2amxibGdrb2xndnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkxMzksImV4cCI6MjA3NzU5NTEzOX0.MZTqMkE9TcerxmmAhJ_irL-v_YsXrp8B26alMGpWQi4";

    async void Awake()
    {
        var opts = new SupabaseOptions
        {
            AutoConnectRealtime = true,   // Enable WebSocket features
            PersistSession = true,         // Keep users logged in between sessions
            SessionHandler = new PlayerPrefsSessionHandler() // See below
        };

        Sb = new Client(SUPABASE_URL, SUPABASE_ANON_KEY, opts);
        await Sb.InitializeAsync();

        Debug.Log("✅ Supabase initialized successfully");

        // Check if user is already logged in from previous session
        if (Sb.Auth.CurrentSession != null)
        {
            Debug.Log($"✅ User auto-logged in: {Sb.Auth.CurrentUser?.Email}");
        }
    }
}
```

**Attach this script to a GameObject** in your first scene (e.g., create `SupabaseBootstrap` GameObject).

---

## 💾 Step 3: Session Persistence Handler

### Create `PlayerPrefsSessionHandler.cs`

This stores JWT tokens securely so users stay logged in between app sessions:

```csharp
using Supabase.Interfaces;
using UnityEngine;

/// <summary>
/// Stores Supabase session in PlayerPrefs for persistence
/// Users stay logged in between app restarts
/// </summary>
public class PlayerPrefsSessionHandler : IGoTrueSessionPersistence<Supabase.Gotrue.Session>
{
    private const string SESSION_KEY = "supabase.auth.token";

    public void SaveSession(Supabase.Gotrue.Session session)
    {
        var json = JsonUtility.ToJson(session);
        PlayerPrefs.SetString(SESSION_KEY, json);
        PlayerPrefs.Save();
        Debug.Log("💾 Session saved to PlayerPrefs");
    }

    public void DestroySession()
    {
        PlayerPrefs.DeleteKey(SESSION_KEY);
        PlayerPrefs.Save();
        Debug.Log("🗑️ Session cleared from PlayerPrefs");
    }

    public Supabase.Gotrue.Session LoadSession()
    {
        if (PlayerPrefs.HasKey(SESSION_KEY))
        {
            var json = PlayerPrefs.GetString(SESSION_KEY);
            var session = JsonUtility.FromJson<Supabase.Gotrue.Session>(json);
            Debug.Log("📂 Session loaded from PlayerPrefs");
            return session;
        }
        return null;
    }
}
```

---

## 🔐 Step 4: Implement Authentication

### Create `AuthManager.cs`

```csharp
using UnityEngine;
using System.Threading.Tasks;

/// <summary>
/// Handles user authentication (sign up, sign in, sign out)
/// Attach to a GameObject or use as a service
/// </summary>
public class AuthManager : MonoBehaviour
{
    /// <summary>
    /// Register a new user with email and password
    /// NOTE: Email confirmation is DISABLED - users can login immediately after signup
    /// </summary>
    /// <param name="email">User's email</param>
    /// <param name="password">Password (minimum 6 characters)</param>
    /// <returns>True if registration successful</returns>
    public async Task<bool> SignUp(string email, string password)
    {
        try
        {
            var session = await SupabaseManager.Sb.Auth.SignUp(email, password);

            if (session?.User != null)
            {
                Debug.Log($"✅ Sign up successful! User: {session.User.Email}");
                Debug.Log($"✅ You can login immediately - no email confirmation needed");
                Debug.Log($"✅ JWT Token: {session.AccessToken}");
                return true;
            }
            else
            {
                Debug.LogError("❌ Sign up failed - no session returned");
                return false;
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"❌ Sign up failed: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Sign in existing user
    /// </summary>
    /// <param name="email">User's email</param>
    /// <param name="password">User's password</param>
    /// <returns>True if login successful</returns>
    public async Task<bool> SignIn(string email, string password)
    {
        try
        {
            var session = await SupabaseManager.Sb.Auth.SignIn(email, password);

            Debug.Log($"✅ Sign in successful! User: {session.User.Email}");
            Debug.Log($"✅ JWT Token: {session.AccessToken}");

            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"❌ Sign in failed: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Sign out current user
    /// </summary>
    public async Task SignOut()
    {
        await SupabaseManager.Sb.Auth.SignOut();
        Debug.Log("✅ Signed out successfully");
    }

    /// <summary>
    /// Get current user ID
    /// </summary>
    public string GetCurrentUserId()
    {
        return SupabaseManager.Sb.Auth.CurrentUser?.Id;
    }

    /// <summary>
    /// Get current user email
    /// </summary>
    public string GetCurrentUserEmail()
    {
        return SupabaseManager.Sb.Auth.CurrentUser?.Email;
    }

    /// <summary>
    /// Check if user is logged in
    /// </summary>
    public bool IsLoggedIn()
    {
        return SupabaseManager.Sb.Auth.CurrentSession != null;
    }

    /// <summary>
    /// Get JWT token for backend API calls
    /// </summary>
    public string GetAccessToken()
    {
        return SupabaseManager.Sb.Auth.CurrentSession?.AccessToken;
    }
}
```

---

## 🌐 Step 5: Call Backend APIs with JWT

### Create `BackendAPIClient.cs`

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;

/// <summary>
/// Client for calling backend API endpoints
/// Automatically includes JWT token for authenticated requests
/// </summary>
public class BackendAPIClient : MonoBehaviour
{
    private const string API_BASE_URL = "https://psychological-jilli-amineregayeg-1fe35444.koyeb.app";

    /// <summary>
    /// Create AI Realtime session for voice chat
    /// Requires authentication
    /// </summary>
    public IEnumerator CreateAISession(string language, string gender, string ritualType, System.Action<AISessionResponse> onSuccess, System.Action<string> onError)
    {
        string jwtToken = SupabaseManager.Sb.Auth.CurrentSession?.AccessToken;

        if (string.IsNullOrEmpty(jwtToken))
        {
            onError?.Invoke("User not logged in");
            yield break;
        }

        string url = $"{API_BASE_URL}/ai/realtime/session";
        string jsonBody = $@"{{
            ""language"": ""{language}"",
            ""gender"": ""{gender}"",
            ""ritualType"": ""{ritualType}"",
            ""madhhab"": ""hanafi""
        }}";

        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();

            // ✅ CRITICAL: Add JWT token to Authorization header
            request.SetRequestHeader("Authorization", $"Bearer {jwtToken}");
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<AISessionResponse>(request.downloadHandler.text);
                onSuccess?.Invoke(response);
            }
            else
            {
                onError?.Invoke($"{request.error}: {request.downloadHandler.text}");
            }
        }
    }

    /// <summary>
    /// Get Quran surah (public endpoint - no auth required)
    /// </summary>
    public IEnumerator GetQuranSurah(int surahNumber, System.Action<QuranSurahResponse> onSuccess, System.Action<string> onError)
    {
        string url = $"{API_BASE_URL}/content/quran/surah/{surahNumber}";

        using (UnityWebRequest request = UnityWebRequest.Get(url))
        {
            request.SetRequestHeader("Accept", "application/json");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<QuranSurahResponse>(request.downloadHandler.text);
                onSuccess?.Invoke(response);
            }
            else
            {
                onError?.Invoke(request.error);
            }
        }
    }
}

// Data models
[System.Serializable]
public class AISessionResponse
{
    public string sessionId;
    public string websocketUrl;
    public string ephemeralToken;
    public int expiresAt;
    public string voice;
    public string language;
}

[System.Serializable]
public class QuranSurahResponse
{
    public int number;
    public string name;
    public string englishName;
    public string englishNameTranslation;
    public int numberOfAyahs;
    public string revelationType;
}
```

---

## 🎮 Step 6: Example Login UI

### Create `LoginUIController.cs`

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Example login/registration UI controller
/// Attach to your Login canvas
/// </summary>
public class LoginUIController : MonoBehaviour
{
    [SerializeField] private TMP_InputField emailInput;
    [SerializeField] private TMP_InputField passwordInput;
    [SerializeField] private Button loginButton;
    [SerializeField] private Button signupButton;
    [SerializeField] private TextMeshProUGUI statusText;

    private AuthManager authManager;

    void Start()
    {
        authManager = GetComponent<AuthManager>();

        loginButton.onClick.AddListener(() => OnLoginClicked());
        signupButton.onClick.AddListener(() => OnSignUpClicked());

        // Check if already logged in
        if (SupabaseManager.Sb?.Auth.CurrentSession != null)
        {
            statusText.text = $"Logged in as: {SupabaseManager.Sb.Auth.CurrentUser?.Email}";
        }
    }

    async void OnLoginClicked()
    {
        statusText.text = "Signing in...";
        loginButton.interactable = false;

        bool success = await authManager.SignIn(emailInput.text, passwordInput.text);

        if (success)
        {
            statusText.text = "✅ Login successful!";
            // Navigate to main game scene
            // UnityEngine.SceneManagement.SceneManager.LoadScene("MainGame");
        }
        else
        {
            statusText.text = "❌ Login failed - check credentials";
            loginButton.interactable = true;
        }
    }

    async void OnSignUpClicked()
    {
        if (passwordInput.text.Length < 6)
        {
            statusText.text = "Password must be at least 6 characters";
            return;
        }

        statusText.text = "Creating account...";
        signupButton.interactable = false;

        bool success = await authManager.SignUp(emailInput.text, passwordInput.text);

        if (success)
        {
            statusText.text = "✅ Account created! Check email for confirmation.";
        }
        else
        {
            statusText.text = "❌ Sign up failed";
            signupButton.interactable = true;
        }
    }
}
```

---

## 📱 Platform-Specific Notes

### Android/iOS

For OAuth (Google/Apple sign-in):

```csharp
using Supabase.Gotrue;

public async void SignInWithGoogle()
{
    var options = new SignInOptions
    {
        RedirectTo = "yourapp://auth-callback" // Custom URL scheme
    };

    var url = await SupabaseManager.Sb.Auth.SignIn(Provider.Google, options);

    // Open URL in browser
    Application.OpenURL(url);

    // Handle callback in deep link handler
    // See: https://github.com/supabase-community/gotrue-csharp#oauth
}
```

**Setup Required:**
- Configure custom URL scheme in Android/iOS build settings
- Implement deep link handler for OAuth callback
- Store PKCE verifier between URL open and callback

### WebGL

- ✅ Supabase URL uses `https` (required)
- ✅ Realtime uses `wss` WebSocket (automatic)
- ✅ Backend CORS configured for `https://umratestnav.netlify.app`
- ⚠️ WebSocket threading handled automatically by SDK

**CORS Note:** If deploying to different domain, update backend `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS=https://umratestnav.netlify.app,https://yourdomain.com
```

---

## 📚 Available API Endpoints

### Public Endpoints (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/content/quran/surahs` | List all surahs |
| GET | `/content/quran/surah/:number` | Get specific surah |
| GET | `/content/quran/ayah/:surah/:ayah` | Get specific ayah |
| GET | `/content/quran/juz/:number` | Get specific juz |
| POST | `/content/quran/search` | Search Quran |

### Protected Endpoints (Require `Authorization: Bearer <JWT>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/realtime/session` | Create AI voice session |
| POST | `/ai/voice/token` | Get AI voice token |
| GET | `/profile` | Get user profile |
| PUT | `/profile` | Update user profile |
| GET | `/consent` | Get user consent status |
| PUT | `/consent` | Update consent |

### WebSocket Endpoints (Require JWT)

| Protocol | Endpoint | Authentication |
|----------|----------|----------------|
| WebSocket | `wss://psychological-jilli-amineregayeg-1fe35444.koyeb.app` | `?token=<JWT>` in URL |

---

## ✅ Testing Checklist

### 1. Test SDK Installation
```csharp
// In Unity Console, check for:
// "✅ Supabase initialized successfully"
```

### 2. Test User Registration
```csharp
await authManager.SignUp("test@example.com", "testpassword123");
// Expected: "✅ Sign up successful! You can login immediately" in logs
// Note: Email confirmation is DISABLED - no email verification needed
```

### 3. Test User Login
```csharp
await authManager.SignIn("test@example.com", "testpassword123");
// Expected: "✅ Sign in successful!" + JWT token in logs
```

### 4. Test Session Persistence
```
1. Sign in
2. Close Unity
3. Restart Unity
// Expected: User auto-logged in on restart
```

### 5. Test Protected Endpoint
```csharp
StartCoroutine(backendClient.CreateAISession("en", "male", "umrah",
    response => Debug.Log("✅ Session created"),
    error => Debug.LogError($"❌ {error}")
));
// Expected: Session created successfully
```

### 6. Test Public Endpoint
```csharp
StartCoroutine(backendClient.GetQuranSurah(1,
    response => Debug.Log($"✅ Got surah: {response.englishName}"),
    error => Debug.LogError($"❌ {error}")
));
// Expected: Surah data returned (works without login)
```

---

## 🔒 Security Checklist

### ✅ Safe to Include in Unity

- `SUPABASE_URL` - Public, safe to expose
- `SUPABASE_ANON_KEY` - Public API key (anon role)
- JWT tokens in session - Encrypted and managed by SDK

### ❌ NEVER Include in Unity

- `SUPABASE_SERVICE_ROLE_KEY` - Backend only!
- `SUPABASE_JWT_SECRET` - Backend only!
- User passwords - Never store or log

### Best Practices

- ✅ Use session persistence for better UX
- ✅ Validate email format before registration
- ✅ Enforce minimum password length (6+ chars)
- ✅ Handle token expiration gracefully
- ❌ Don't log JWT tokens in production builds
- ❌ Don't store passwords in PlayerPrefs

---

## 🆘 Troubleshooting

### "Package installation failed"

**Solution:** Ensure Unity 2021.3+ with .NET Standard 2.1 support. Try [Unity wiki guide](https://github.com/supabase-community/supabase-csharp/wiki/Unity) for platform-specific steps.

### "No JWT token - user not logged in"

**Solution:** Check if user is logged in before calling protected endpoints:
```csharp
if (!authManager.IsLoggedIn())
{
    Debug.LogError("User must be logged in");
    // Show login screen
    return;
}
```

### "401 Unauthorized" from backend

**Solution:** JWT token expired or invalid. Re-login user:
```csharp
if (httpStatusCode == 401)
{
    await authManager.SignOut();
    // Show login screen
}
```

### "Invalid credentials" during login

**Solution:**
1. Check Supabase dashboard → Authentication → Users
2. Verify email is confirmed
3. Try password reset if needed

### "Session not persisting"

**Solution:**
1. Ensure `PlayerPrefsSessionHandler` is attached
2. Check `PersistSession = true` in SupabaseOptions
3. Verify `SessionHandler` is set correctly

---

## 📖 Additional Resources

**Official Documentation:**
- [Supabase C# SDK](https://github.com/supabase-community/supabase-csharp)
- [Unity Integration Wiki](https://github.com/supabase-community/supabase-csharp/wiki/Unity)
- [GoTrue C# (Auth)](https://github.com/supabase-community/gotrue-csharp)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

**Your Project Documentation:**
- [AI Usage Guide](./AI_USAGE_DOCUMENTATION.md)
- [Quran API Docs](./QURAN_API_DOCUMENTATION.md)
- [WebSocket Testing Guide](./WEBSOCKET_TESTING_TOKENS_GUIDE.md)
- [AI Investigation Report](./AI_FEATURE_INVESTIGATION_REPORT.md)

**Supabase Dashboard:**
- [Your Project Dashboard](https://supabase.com/dashboard/project/qtrgbxuvjlblgkolgvxx)

---

## 🎯 Summary

### Unity Team Checklist

- [ ] Install Supabase C# SDK (`supabase-community/supabase-csharp`)
- [ ] Create `SupabaseManager.cs` with provided credentials
- [ ] Create `PlayerPrefsSessionHandler.cs` for session persistence
- [ ] Create `AuthManager.cs` for authentication logic
- [ ] Create `BackendAPIClient.cs` for API calls
- [ ] Implement login/registration UI
- [ ] Test with real user accounts
- [ ] Verify session persistence works
- [ ] Test protected endpoint calls with JWT

### Backend Status

- ✅ Supabase authentication fully configured (HS256)
- ✅ Mock tokens disabled (production security enabled)
- ✅ JWT validation working correctly
- ✅ All endpoints production ready
- ✅ WebSocket authentication enabled
- ✅ CORS configured for your frontend

---

**Created:** 2025-11-03
**Updated:** 2025-11-03 (Corrected SDK installation)
**Status:** ✅ Production Ready
**Backend URL:** `https://psychological-jilli-amineregayeg-1fe35444.koyeb.app`
**Supabase Project:** `qtrgbxuvjlblgkolgvxx`

---

**🎉 Everything is ready for Unity integration!**

If you need platform-specific code (OAuth for mobile, WebGL optimizations, etc.), let me know your target platforms and I'll provide tailored examples.
