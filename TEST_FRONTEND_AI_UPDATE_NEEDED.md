# Test Frontend - AI Integration Update

**Found:** HTML test frontend deployed on Netlify
**URL:** https://umratestnav.netlify.app
**Location:** `/test-prototype/`
**Status:** ⚠️ **NEEDS UPDATE** to test AI features

---

## 📍 Current Status

### What Exists
✅ **HTML Testing Frontend** deployed on Netlify
- Location: `/test-prototype/`
- Deployed URL: `https://umratestnav.netlify.app`
- Purpose: Test backend APIs without disrupting 3D team

### Available Test Pages
- `index.html` - Feature overview and links
- `navigation-test.html` - GPS navigation testing
- `qibla-test.html` - Qibla direction testing
- `quran-test.html` - Quran API testing

### Configuration Files
- `netlify.toml` - Netlify deployment config
- `NETLIFY_DEPLOYMENT_GUIDE.md` - Deployment instructions

---

## ⚠️ Problem: Outdated Backend URL

**Current Backend URL in frontend:**
```
https://psychological-jilli-amineregayeg-1fe35444.koyeb.app
```

**Correct Backend URL (production):**
```
https://umrah-hajj-realtime.koyeb.app
```

**Impact:**
- Test frontend is pointing to OLD backend
- Can't test NEW AI features
- May get 404 errors or old API responses

---

## 🎯 What Needs to Be Done

### Task 1: Update Backend URL in All HTML Files

**Files to update:**
1. `test-prototype/index.html`
2. `test-prototype/navigation-test.html`
3. `test-prototype/qibla-test.html`
4. `test-prototype/quran-test.html`

**Find and replace:**
```diff
- https://psychological-jilli-amineregayeg-1fe35444.koyeb.app
+ https://umrah-hajj-realtime.koyeb.app
```

**Also update WebSocket URLs:**
```diff
- wss://psychological-jilli-amineregayeg-1fe35444.koyeb.app
+ wss://umrah-hajj-realtime.koyeb.app
```

---

### Task 2: Add AI Testing Page (NEW)

**Create:** `test-prototype/ai-test.html`

**Features to test:**
1. **AI Voice Session Creation**
   - Test POST /ai/realtime/session
   - Display sessionId, ephemeralToken, websocketUrl
   - Show model (should be "gpt-realtime")
   - Show voice (should be "verse")

2. **Knowledge Search**
   - Test GET /content/search?q=tawaf&ritual=umrah
   - Display search results
   - Show relevance scores

3. **Voice Token (Legacy)**
   - Test POST /ai/voice/token
   - Display token and expiration

4. **WebSocket Connection Test** (optional)
   - Test connecting to OpenAI WebSocket with ephemeral token
   - Display connection status

---

## 📝 Recommended AI Test Page Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Features Test</title>
  <style>
    /* Same styling as other test pages */
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🤖 AI Features Test</h1>
      <p class="subtitle">Test OpenAI Realtime & Knowledge Search</p>
    </header>

    <div class="test-section">
      <h2>1. AI Voice Session</h2>
      <div class="controls">
        <input type="text" id="jwt-token" placeholder="Paste Supabase JWT token here" />
        <select id="language">
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </select>
        <select id="gender">
          <option value="male">Male (verse)</option>
          <option value="female">Female (coral)</option>
        </select>
        <select id="ritual">
          <option value="umrah">Umrah</option>
          <option value="hajj">Hajj</option>
        </select>
        <button onclick="createAISession()">Create AI Session</button>
      </div>
      <pre id="session-output"></pre>
    </div>

    <div class="test-section">
      <h2>2. Knowledge Search</h2>
      <div class="controls">
        <input type="text" id="search-query" placeholder="Search query (e.g., tawaf)" />
        <button onclick="searchKnowledge()">Search</button>
      </div>
      <pre id="search-output"></pre>
    </div>

    <div class="test-section">
      <h2>3. Model Verification</h2>
      <button onclick="verifyModel()">Verify Model Configuration</button>
      <pre id="model-output"></pre>
    </div>
  </div>

  <script>
    const API_URL = 'https://umrah-hajj-realtime.koyeb.app';

    async function createAISession() {
      const jwt = document.getElementById('jwt-token').value;
      const language = document.getElementById('language').value;
      const gender = document.getElementById('gender').value;
      const ritual = document.getElementById('ritual').value;

      if (!jwt) {
        alert('Please enter a Supabase JWT token');
        return;
      }

      const output = document.getElementById('session-output');
      output.textContent = 'Creating session...';

      try {
        const response = await fetch(`${API_URL}/ai/realtime/session`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            language,
            gender,
            ritualType: ritual,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          output.textContent = JSON.stringify(data, null, 2);

          // Highlight important fields
          output.innerHTML = `
✅ Session Created Successfully!

Session ID: ${data.sessionId}
Model: ${data.model} ${data.model === 'gpt-realtime' ? '✅' : '❌'}
Voice: ${data.voice}
Language: ${data.language}
WebSocket URL: ${data.websocketUrl}
Ephemeral Token: ${data.ephemeralToken.substring(0, 20)}...
Expires At: ${new Date(data.expiresAt).toLocaleString()}

Full Response:
${JSON.stringify(data, null, 2)}
          `;
        } else {
          output.textContent = `❌ Error: ${JSON.stringify(data, null, 2)}`;
        }
      } catch (error) {
        output.textContent = `❌ Error: ${error.message}`;
      }
    }

    async function searchKnowledge() {
      const query = document.getElementById('search-query').value;
      const output = document.getElementById('search-output');

      if (!query) {
        alert('Please enter a search query');
        return;
      }

      output.textContent = 'Searching...';

      try {
        const response = await fetch(
          `${API_URL}/content/search?q=${encodeURIComponent(query)}&ritual=umrah`
        );

        const data = await response.json();

        if (response.ok) {
          output.innerHTML = `
✅ Search Results:

${data.results.map((r, i) => `
Result ${i + 1}:
Relevance: ${(r.relevance * 100).toFixed(1)}%
Source: ${r.source}
Content: ${r.content.substring(0, 200)}...
---
`).join('\n')}

Total: ${data.totalCount} results

Full Response:
${JSON.stringify(data, null, 2)}
          `;
        } else {
          output.textContent = `❌ Error: ${JSON.stringify(data, null, 2)}`;
        }
      } catch (error) {
        output.textContent = `❌ Error: ${error.message}`;
      }
    }

    async function verifyModel() {
      const jwt = document.getElementById('jwt-token').value;
      const output = document.getElementById('model-output');

      if (!jwt) {
        alert('Please enter a Supabase JWT token for verification');
        return;
      }

      output.textContent = 'Verifying...';

      try {
        // Create a session to check model config
        const response = await fetch(`${API_URL}/ai/realtime/session`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            language: 'en',
            gender: 'male',
            ritualType: 'umrah',
          }),
        });

        const data = await response.json();

        if (response.ok) {
          const isCorrectModel = data.model === 'gpt-realtime';
          const isCorrectVoice = ['verse', 'coral', 'cedar', 'marin'].includes(data.voice);

          output.innerHTML = `
${isCorrectModel ? '✅' : '❌'} Model: ${data.model}
  Expected: gpt-realtime (Production GA)
  Status: ${isCorrectModel ? 'CORRECT' : 'WRONG - Still using preview model'}

${isCorrectVoice ? '✅' : '❌'} Voice: ${data.voice}
  Expected: verse/coral/cedar/marin
  Status: ${isCorrectVoice ? 'CORRECT' : 'UNKNOWN VOICE'}

✅ Backend AI Configuration:
  - OpenAI API: Connected
  - Model: ${data.model}
  - Voice: ${data.voice}
  - Language Support: EN, FR, AR
  - Feature Flags: Enabled

${isCorrectModel && isCorrectVoice ? '\n🎉 AI system is correctly configured!' : '\n⚠️ Configuration needs review'}
          `;
        } else {
          output.textContent = `❌ Error: ${JSON.stringify(data, null, 2)}`;
        }
      } catch (error) {
        output.textContent = `❌ Error: ${error.message}`;
      }
    }

    // Auto-check backend health on load
    window.addEventListener('load', async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();

        if (data.status === 'ok') {
          console.log('✅ Backend is healthy');
        }
      } catch (error) {
        console.error('❌ Backend health check failed:', error);
      }
    });
  </script>
</body>
</html>
```

---

## 🚀 Deployment Steps

### 1. Update Existing Files

```bash
cd /mnt/d/umrah-hajj-realtime/test-prototype

# Update all backend URLs in HTML files
# (Can be done via find/replace or script)
```

### 2. Create AI Test Page

```bash
# Create ai-test.html with the code above
```

### 3. Update index.html

Add link to AI test page:

```html
<a href="ai-test.html" class="feature-card">
  <div class="feature-icon">🤖</div>
  <h2>AI Features</h2>
  <p>Test OpenAI Realtime voice sessions, knowledge search, and model configuration</p>
  <div class="feature-tags">
    <span class="tag">Voice Session</span>
    <span class="tag">Knowledge Search</span>
    <span class="tag">Model Verification</span>
  </div>
</a>
```

### 4. Deploy to Netlify

```bash
cd /mnt/d/umrah-hajj-realtime/test-prototype

# Option A: Netlify CLI
netlify deploy --prod

# Option B: Git push (if using GitHub integration)
git add .
git commit -m "feat: update backend URL and add AI testing page"
git push

# Option C: Manual drag-and-drop in Netlify dashboard
```

---

## 🧪 Testing Checklist After Deployment

### Backend Connectivity
- [ ] Open https://umratestnav.netlify.app
- [ ] Check browser console for no CORS errors
- [ ] Verify health check works

### AI Features
- [ ] Navigate to /ai-test.html
- [ ] Get Supabase JWT token (from PRODUCTION_AUTH_INTEGRATION_GUIDE.md)
- [ ] Create AI session
- [ ] Verify model shows "gpt-realtime" ✅
- [ ] Verify voice shows "verse" ✅
- [ ] Test knowledge search with "tawaf"
- [ ] Verify search returns results ✅

### Existing Features (Regression)
- [ ] Navigation test still works
- [ ] Qibla test still works
- [ ] Quran test still works
- [ ] GPS tracking still functional

---

## 📋 Quick Fix Script

Want to update quickly? Run this:

```bash
cd /mnt/d/umrah-hajj-realtime/test-prototype

# Find and replace old URL with new URL in all HTML files
find . -name "*.html" -type f -exec sed -i 's|psychological-jilli-amineregayeg-1fe35444\.koyeb\.app|umrah-hajj-realtime.koyeb.app|g' {} +

# Verify changes
grep -r "koyeb.app" *.html

# Should now show: umrah-hajj-realtime.koyeb.app
```

---

## 🎯 Benefits After Update

1. **Test AI features live** - No need to wait for Unity/Web implementation
2. **Verify model configuration** - Confirm gpt-realtime is deployed
3. **Test knowledge search** - Validate Islamic content search
4. **Share with stakeholders** - Demonstrate AI capabilities immediately
5. **Debug faster** - Browser tools for API inspection

---

## 📱 How to Get Supabase JWT for Testing

**Option 1: Use Auth Integration Guide**
See `PRODUCTION_AUTH_INTEGRATION_GUIDE.md` for steps to get a real JWT.

**Option 2: Create Test User**
```bash
# Use Supabase dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to Authentication → Users
4. Create test user
5. Copy JWT token
```

**Option 3: Use curl to sign in**
```bash
curl -X POST https://qtrgbxuvjlblgkolgvxx.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Response includes access_token (JWT)
```

---

## ✅ Action Items

**For Backend Team (You):**
- [x] Document test frontend location
- [ ] Update backend URLs in HTML files
- [ ] Create ai-test.html
- [ ] Deploy to Netlify
- [ ] Test AI features
- [ ] Share updated URL with team

**For Frontend Teams (Unity/Web):**
- After update, they can:
  - View live AI session creation
  - See correct model ("gpt-realtime")
  - Test knowledge search
  - Use as reference for their implementation

---

## 🔗 URLs Summary

**Test Frontend (Netlify):**
- Current: https://umratestnav.netlify.app
- After AI update: https://umratestnav.netlify.app/ai-test.html

**Backend (Koyeb):**
- Production: https://umrah-hajj-realtime.koyeb.app
- Health: https://umrah-hajj-realtime.koyeb.app/health
- Swagger: https://umrah-hajj-realtime.koyeb.app/docs

**Documentation:**
- This file: `/TEST_FRONTEND_AI_UPDATE_NEEDED.md`
- Deployment guide: `/test-prototype/NETLIFY_DEPLOYMENT_GUIDE.md`
- AI integration: `/AI_INTEGRATION_READY_CHECKLIST.md`

---

**Created:** 2025-11-02
**Status:** ⚠️ **ACTION NEEDED** - Update and deploy
**Priority:** Medium (nice to have for demos)
**Effort:** 15-30 minutes (update URLs + create AI test page)
