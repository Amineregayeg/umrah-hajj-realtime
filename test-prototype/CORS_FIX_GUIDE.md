# CORS Fix Guide for Netlify Deployment

**Issue:** Frontend deployed on Netlify cannot access backend API
**Error:** "Failed to fetch" on mobile/browser
**Cause:** Backend CORS configuration doesn't include Netlify URL

---

## 🎯 Quick Fix (5 Minutes)

### Step 1: Go to Koyeb Dashboard

1. Open: https://app.koyeb.com
2. Login to your account
3. Click on your service: `psychological-jilli-amineregayeg-1fe35444`

### Step 2: Update Environment Variables

1. Click **"Settings"** tab
2. Scroll to **"Environment Variables"** section
3. Find the variable: `ALLOWED_ORIGINS`
4. Click **"Edit"** (pencil icon)

### Step 3: Add Netlify URL

**Current Value:**
```
http://localhost:3000,http://localhost:3001
```

**New Value (add your Netlify URL):**
```
http://localhost:3000,http://localhost:3001,https://umratestnav.netlify.app
```

**Important:**
- ✅ Include `https://` prefix
- ✅ Use exact URL (no trailing slash)
- ✅ Comma-separated, no spaces
- ✅ Include both localhost URLs for local testing

### Step 4: Redeploy

1. Click **"Save"** or **"Update"**
2. Koyeb will automatically redeploy your service
3. Wait ~2-3 minutes for deployment to complete
4. Check deployment status shows **"Healthy"**

### Step 5: Verify Fix

**Test from command line:**
```bash
curl -i "https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/content/qibla?lat=40.7128&lng=-74.0060" \
  -H "Origin: https://umratestnav.netlify.app"
```

**Expected Result:**
- HTTP 200 status
- `access-control-allow-origin: https://umratestnav.netlify.app` header present
- Qibla direction data in response

### Step 6: Test on Mobile

1. Open: `https://umratestnav.netlify.app`
2. Click **"Qibla Module"**
3. Click **"Use My Location"** → Grant permission
4. **Should work now!** ✅

---

## 📋 Environment Variable Reference

### ALLOWED_ORIGINS Format

```bash
# Single origin
ALLOWED_ORIGINS=https://umratestnav.netlify.app

# Multiple origins (comma-separated, no spaces)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://umratestnav.netlify.app

# With custom domain (if you add one later)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://umratestnav.netlify.app,https://your-custom-domain.com
```

### Other Origins You Might Need

If you have multiple Netlify deployments or domains:

```bash
# Development + Staging + Production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://umratestnav.netlify.app,https://staging-umrah.netlify.app,https://umrah-app.com

# Wildcard for Netlify subdomains (NOT RECOMMENDED for production)
# Note: Backend doesn't support wildcards, must list each URL explicitly
```

---

## 🔍 How to Verify CORS is Working

### Method 1: Browser DevTools

1. Open Netlify app in browser
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Try to use Qibla module
5. Check for errors

**If CORS is broken:**
```
Access to fetch at 'https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/content/qibla?...'
from origin 'https://umratestnav.netlify.app' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**If CORS is working:**
```
✓ No CORS errors
✓ API requests succeed
✓ Data loads correctly
```

### Method 2: Network Tab

1. Open DevTools → **Network** tab
2. Filter by **Fetch/XHR**
3. Trigger an API call (e.g., calculate Qibla)
4. Click on the request
5. Check **Response Headers**

**Look for:**
```
access-control-allow-origin: https://umratestnav.netlify.app
access-control-allow-credentials: true
```

### Method 3: Command Line Test

```bash
# Test with Origin header
curl -i "https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/content/qibla?lat=21.4225&lng=39.8262" \
  -H "Origin: https://umratestnav.netlify.app"

# Should return:
# HTTP/2 200
# access-control-allow-origin: https://umratestnav.netlify.app
# + JSON response with qibla data
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Wrong: Trailing Slash
```bash
ALLOWED_ORIGINS=https://umratestnav.netlify.app/
# This WON'T work - no trailing slash allowed!
```

### ❌ Wrong: Missing Protocol
```bash
ALLOWED_ORIGINS=umratestnav.netlify.app
# This WON'T work - must include https://
```

### ❌ Wrong: Spaces After Commas
```bash
ALLOWED_ORIGINS=http://localhost:3000, http://localhost:3001
# This WON'T work - no spaces allowed
```

### ❌ Wrong: Using HTTP Instead of HTTPS
```bash
ALLOWED_ORIGINS=http://umratestnav.netlify.app
# This WON'T work - Netlify uses HTTPS
```

### ✅ Correct Format
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://umratestnav.netlify.app
```

---

## 🔧 Troubleshooting

### Issue: Still getting CORS errors after update

**Solution 1: Check Koyeb Deployment**
- Go to Koyeb dashboard
- Check service status is **"Healthy"**
- Check deployment logs for errors
- Verify environment variable was saved

**Solution 2: Clear Browser Cache**
```bash
# In browser:
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Or clear cache: DevTools → Application → Clear storage
```

**Solution 3: Verify Environment Variable**
```bash
# Check Koyeb logs to see what ALLOWED_ORIGINS was loaded
# In Koyeb dashboard → Logs tab
# Look for: "ALLOWED_ORIGINS: http://localhost:3000,..."
```

### Issue: Qibla works but Quran/Navigation doesn't

**Cause:** Different endpoints, same CORS issue
**Solution:** Same fix - update ALLOWED_ORIGINS

### Issue: Works on desktop, not on mobile

**Cause:** Mobile browsers enforce CORS more strictly
**Solution:** Ensure ALLOWED_ORIGINS includes your Netlify URL

---

## 📱 After Fix - Testing Checklist

Once CORS is fixed, test these features:

### Qibla Module
- [ ] Opens without errors
- [ ] "Use My Location" works
- [ ] Compass displays correctly
- [ ] "Start Live Tracking" works
- [ ] GPS accuracy shows
- [ ] Direction updates as you move

### Navigation Module
- [ ] Graph loads successfully
- [ ] Canvas displays nodes
- [ ] "Start GPS Tracking" works
- [ ] Red dot appears at position
- [ ] Position updates when moving
- [ ] No CORS errors in console

### Quran Module
- [ ] Surah list loads (if implemented)
- [ ] Text displays correctly
- [ ] No fetch errors

---

## 🎯 Expected Timeline

1. **Update ALLOWED_ORIGINS:** 1 minute
2. **Koyeb redeploy:** 2-3 minutes
3. **Test on mobile:** 1 minute
4. **Total:** ~5 minutes

---

## 📞 Quick Commands Reference

### Test Backend Health
```bash
curl https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/health
```

### Test Qibla with CORS
```bash
curl -i "https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/content/qibla?lat=21.4225&lng=39.8262" \
  -H "Origin: https://umratestnav.netlify.app" | grep -i "access-control"
```

### Check Current ALLOWED_ORIGINS (from logs)
```bash
# In Koyeb dashboard:
# Services → psychological-jilli-amineregayeg-1fe35444 → Logs
# Search for: "ALLOWED_ORIGINS"
```

---

## ✅ Success Criteria

**You'll know CORS is fixed when:**

1. ✅ No "Failed to fetch" errors
2. ✅ No CORS errors in browser console
3. ✅ API requests return data
4. ✅ Qibla compass works on mobile
5. ✅ GPS tracking works on mobile
6. ✅ Navigation graph loads

---

## 🔐 Security Note

**ALLOWED_ORIGINS is a security feature** that prevents unauthorized websites from using your API.

**Production Best Practice:**
```bash
# Only allow your actual domains
ALLOWED_ORIGINS=https://umratestnav.netlify.app,https://your-production-domain.com

# Don't use wildcards (*)
# Don't allow all origins
```

**Development Best Practice:**
```bash
# Include localhost for local testing
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://umratestnav.netlify.app
```

---

## 📝 Summary

**Problem:** CORS blocking Netlify → Koyeb requests
**Fix:** Add `https://umratestnav.netlify.app` to `ALLOWED_ORIGINS`
**Time:** 5 minutes
**Result:** Full frontend functionality on mobile

**Next Steps:**
1. Update ALLOWED_ORIGINS in Koyeb ✅
2. Wait for redeploy ✅
3. Test on mobile ✅
4. Celebrate working GPS tracking! 🎉

---

**Guide Created:** October 17, 2025
**Backend:** psychological-jilli-amineregayeg-1fe35444.koyeb.app
**Frontend:** umratestnav.netlify.app
**Status:** Ready to fix
