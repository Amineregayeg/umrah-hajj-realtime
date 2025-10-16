# 🚀 Koyeb Quick Start - Copy & Paste Ready

## 1️⃣ Create Service in Koyeb

1. Go to: https://koyeb.com
2. Click: **Create Web Service** → **GitHub**
3. Select: `Amineregayeg/umrah-hajj-realtime`
4. Branch: `deploy/koyeb-setup`

---

## 2️⃣ Configure Build (CRITICAL ⚠️)

```
Builder:          Docker
Dockerfile path:  apps/backend/Dockerfile
Build context:    .
```

**⚠️ Build context MUST be `.` (repo root), NOT `apps/backend`**

---

## 3️⃣ Copy-Paste Environment Variables

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://neondb_owner:npg_cX37PBfohMqZ@ep-summer-cherry-a1mtg9rw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
AUTH_MODE=mock
PRAYER_DEFAULT_METHOD=4
WS_MSGPACK_ENABLED=false
ENABLE_MSGPACK=false
ALLOWED_ORIGINS=http://localhost:3000
WS_ORIGIN=http://localhost:3000
```

**📝 Note:** Update `ALLOWED_ORIGINS` and `WS_ORIGIN` after you get your Koyeb URL

---

## 4️⃣ Configure Health Check

```
Path:           /metrics/healthz
Initial delay:  40 seconds
Timeout:        10 seconds
Interval:       30 seconds
```

---

## 5️⃣ Choose Instance

- **Staging/Testing:** Nano (free)
- **Production:** Micro or Small

---

## 6️⃣ Deploy & Wait

Click **Deploy** → Wait ~5-10 minutes → Get your URL

---

## 7️⃣ Test Your Deployment

Replace `YOUR_APP` with your actual Koyeb app name:

```bash
# Save your URL
export APP="https://YOUR_APP.koyeb.app"

# Test health
curl -s $APP/metrics/healthz | jq .

# Test Swagger (open in browser)
open $APP/docs

# Test Qur'an API
curl -s "$APP/content/quran/surah/1?lang=ar" | head -60

# Test Qibla
curl -s "$APP/content/qibla?lat=21.4225&lng=39.8262" | jq .

# Test WebSocket
npm install -g wscat
wscat -c "wss://YOUR_APP.koyeb.app/ws?token=MOCK"
```

---

## 8️⃣ Update CORS Settings

After deployment, go back to Koyeb → Environment Variables → Update:

```bash
ALLOWED_ORIGINS=https://YOUR_APP.koyeb.app,http://localhost:3000
WS_ORIGIN=https://YOUR_APP.koyeb.app
```

Then redeploy for changes to take effect.

---

## 9️⃣ Share with Unity Team

**WebSocket:** `wss://YOUR_APP.koyeb.app/ws?token=MOCK`
**REST API:** `https://YOUR_APP.koyeb.app`
**Swagger:** `https://YOUR_APP.koyeb.app/docs`
**Docs:** `docs/UNITY_QUICKSTART.md`

---

## 🆘 Troubleshooting

**Build fails "file not found"**
→ Check Build context = `.` (not `apps/backend`)

**Database connection error**
→ Verify DATABASE_URL includes `?sslmode=require`

**Health check fails**
→ Check logs for startup errors
→ Increase initial delay to 60 seconds

**WebSocket won't connect**
→ Use `wss://` (not `ws://`)
→ Add `?token=MOCK` to URL

---

## 📚 Full Documentation

- **Detailed Guide:** `docs/KOYEB_DEPLOYMENT_CHECKLIST.md`
- **Original Deployment Docs:** `docs/DEPLOY_KOYEB.md`
- **Unity Integration:** `docs/UNITY_QUICKSTART.md`
- **Environment Variables:** `docs/API_ENV_VARS.md`

---

## ✅ Success Checklist

- [ ] Deployed to Koyeb
- [ ] Health check passes
- [ ] Swagger docs accessible
- [ ] Qur'an API works
- [ ] Qibla API works
- [ ] WebSocket connects with MOCK token
- [ ] CORS updated with real URL
- [ ] URL shared with Unity team

---

**Need help?** Check `docs/KOYEB_DEPLOYMENT_CHECKLIST.md` for step-by-step guide.
