# Qibla Module Quick Start Guide

## 🚀 Get Started in 60 Seconds

### 1. Open the Interface

**Option A - Direct File Open:**
```bash
# Windows
start qibla-test.html

# Linux
xdg-open qibla-test.html

# macOS
open qibla-test.html
```

**Option B - Local Server (Recommended for geolocation):**
```bash
# Python 3
python3 -m http.server 8080

# Then open: http://localhost:8080/qibla-test.html
```

### 2. Test with Sample Location

1. Enter coordinates:
   - **Latitude:** `40.7128`
   - **Longitude:** `-74.0060`
2. Click **"Calculate Qibla"**
3. Watch compass animate to **~58°** (Northeast)

### 3. Test with Your Location

1. Click **"Use My Location"**
2. Allow browser location access
3. See your Qibla direction instantly!

---

## 📋 Quick Test Cases

Copy and paste these coordinates:

| Location | Latitude | Longitude | Expected |
|----------|----------|-----------|----------|
| **New York** | 40.7128 | -74.0060 | 58° NE |
| **London** | 51.5074 | -0.1278 | 118° SE |
| **Tokyo** | 35.6762 | 139.6503 | 293° NW |
| **Sydney** | -33.8688 | 151.2093 | 277° W |

---

## 🔧 API Test (Command Line)

Test the backend API directly:

```bash
node test-qibla-api.js
```

This runs automated tests on 7 different locations worldwide.

---

## 📊 What You'll See

### Results Display:
- **Qibla Direction:** Degrees from North (0-360°)
- **Cardinal Direction:** N, NE, E, SE, S, SW, W, NW
- **Distance:** Kilometers to Kaaba
- **Coordinates:** Your location and Kaaba location
- **Timestamp:** When calculation was performed

### Visual Compass:
- **Green Arrow:** Points toward Qibla
- **Red Tail:** Opposite direction
- **N/S/E/W Markers:** Cardinal directions
- **Smooth Animation:** 1-second rotation

---

## ❌ Common Issues & Fixes

### "Unable to retrieve your location"
- **Fix:** Enable location permissions in browser settings
- **Or:** Use HTTPS/localhost (required for geolocation)

### "API request failed"
- **Fix:** Check backend is running at:
  ```
  https://psychological-jilli-amineregayeg-1fe35444.koyeb.app
  ```
- **Test:** Visit `/content/qibla?lat=40.7128&lng=-74.0060`

### Compass not showing
- **Fix:** Check browser console (F12)
- **Or:** Refresh page and try again

### Invalid coordinates error
- **Fix:** Latitude must be -90 to 90
- **Fix:** Longitude must be -180 to 180

---

## 🎨 Features at a Glance

✅ Manual coordinate entry
✅ Browser geolocation
✅ Animated visual compass
✅ Real-time API testing
✅ Distance calculation
✅ Cardinal direction helper
✅ Responsive design
✅ Error handling
✅ Keyboard support (Enter key)

---

## 📱 Mobile Testing

1. Deploy to a web server or use ngrok:
   ```bash
   npx http-server -p 8080
   # Access via: http://your-ip:8080/qibla-test.html
   ```

2. Or use ngrok for HTTPS (required for geolocation):
   ```bash
   ngrok http 8080
   # Access via: https://xxxxx.ngrok.io/qibla-test.html
   ```

---

## 🔍 Verification Checklist

- [ ] Open HTML file successfully
- [ ] Enter manual coordinates
- [ ] Calculate button works
- [ ] Results display correctly
- [ ] Compass animates smoothly
- [ ] "Use My Location" button works
- [ ] Direction matches expected value
- [ ] Distance is reasonable
- [ ] No console errors

---

## 📞 Need Help?

1. **Check browser console** (F12) for errors
2. **Verify API endpoint** is accessible
3. **Review README.md** for detailed documentation
4. **Test with** `node test-qibla-api.js` for backend validation

---

## 🎯 Expected API Response

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
  "calculatedAt": "2025-10-17T12:34:56.789Z"
}
```

---

**Ready to test?** Open `qibla-test.html` and start exploring! 🧭
