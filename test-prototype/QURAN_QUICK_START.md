# Quran Module - Quick Start Guide

Get up and running with the Quran testing module in 2 minutes.

## 🚀 Instant Start

### Option 1: Direct File Open (Simplest)
```bash
# Navigate to directory
cd /mnt/d/umrah-hajj-realtime/test-prototype/

# Open in browser (Windows/WSL)
explorer.exe quran-test.html

# Or on Linux/Mac
xdg-open quran-test.html  # Linux
open quran-test.html       # Mac
```

### Option 2: Local Web Server (Recommended)
```bash
# Using Python 3
cd /mnt/d/umrah-hajj-realtime/test-prototype/
python3 -m http.server 8000

# Or using Node.js
npx http-server -p 8000

# Then open: http://localhost:8000/quran-test.html
```

## ✅ First Tests (30 seconds)

### Test 1: Load a Surah (10s)
1. **Open** `quran-test.html` in browser
2. **Select** "1. Al-Fatihah - The Opening" from dropdown
3. **Click** "Get Surah" button
4. **See** beautiful Arabic text with 7 Ayahs

✨ **Expected**: Green-themed interface, Arabic text flowing right-to-left, Bismillah at top

### Test 2: Search Quran (10s)
1. **Type** "الله" in search box (or "God" for English)
2. **Click** "Search" button
3. **See** highlighted results

✨ **Expected**: Yellow highlighting, clickable results, Surah references

### Test 3: Get Specific Ayah (10s)
1. **Enter** Surah: `2`, Ayah: `255`
2. **Click** "Get Ayah" button
3. **See** Ayat al-Kursi (famous verse)

✨ **Expected**: Large centered text, beautiful formatting

## 📁 File Structure
```
test-prototype/
├── quran-test.html                    ← Main file (open this!)
├── js/
│   ├── quran-module.js                ← Core module (708 lines)
│   └── quran-usage-examples.js        ← Code examples
├── css/
│   └── quran-module.css               ← Styling (704 lines)
├── QURAN_MODULE_README.md             ← Full documentation
├── QURAN_TEST_SPECIFICATION.md        ← Test specs
└── QURAN_QUICK_START.md               ← This file
```

## 🎯 Key Features at a Glance

| Feature | Description | Try It |
|---------|-------------|--------|
| **Get Surah** | Load any of 114 Surahs | Select from dropdown |
| **Search** | Full-text search in Arabic/English | Type "prayer" or "الصلاة" |
| **Get Ayah** | Fetch specific verse | Try 2:255 (Ayat al-Kursi) |
| **RTL Support** | Proper Arabic text rendering | Any Arabic Surah |
| **Highlighting** | Search terms highlighted | Search and see yellow marks |
| **Responsive** | Works on mobile/tablet/desktop | Resize browser |

## 🔗 API Being Tested

**Backend**: `https://psychological-jilli-amineregayeg-1fe35444.koyeb.app`

**Endpoints**:
- `/content/quran/surah/:id?lang=ar|en` - Get complete Surah
- `/content/quran/search?q=QUERY&lang=ar|en&limit=10` - Search
- `/content/quran/ayah?surah=X&ayah=Y&lang=ar` - Get specific Ayah

## 💡 Quick Tips

### Best Surahs to Try First
- **Surah 1** (Al-Fatihah) - Short, beautiful, 7 verses
- **Surah 112** (Al-Ikhlas) - Very short, 4 verses
- **Surah 36** (Ya-Sin) - "Heart of Quran"
- **Surah 67** (Al-Mulk) - Medium length, powerful
- **Surah 2** (Al-Baqarah) - Longest, stress test

### Best Search Terms to Try
**Arabic**:
- `الله` (Allah/God) - Most common
- `الصلاة` (Prayer)
- `الجنة` (Paradise)
- `الرحمن` (The Most Merciful)

**English**:
- `prayer` - Common concept
- `paradise` - Rewards
- `Moses` - Prophets
- `patience` - Virtues

### Famous Ayahs to Fetch
- **2:255** - Ayat al-Kursi (Verse of the Throne)
- **1:1** - First verse of Quran
- **96:1** - First revelation
- **112:1-4** - Surah Al-Ikhlas (complete)

## 🐛 Troubleshooting

### Problem: Nothing happens when clicking buttons
**Solution**: Check browser console (F12) for errors, verify API URL is accessible

### Problem: Arabic text looks broken
**Solution**: Wait for Google Fonts to load, or check internet connection

### Problem: "CORS error" in console
**Solution**: Use local web server (Option 2 above) instead of file:// protocol

### Problem: API returns error
**Solution**:
1. Check backend is running: visit URL in browser
2. Try with valid Surah numbers (1-114)
3. Check network tab in DevTools (F12)

## 📱 Mobile Testing

```bash
# Find your local IP
ipconfig  # Windows
ifconfig  # Linux/Mac

# Start server
python3 -m http.server 8000

# On mobile browser, visit:
http://YOUR_IP:8000/quran-test.html
# Example: http://192.168.1.100:8000/quran-test.html
```

## 🎨 What You'll See

### Beautiful Arabic Typography
- Traditional Islamic fonts (Amiri, Scheherazade)
- Large, readable text (22-28px)
- Right-to-left (RTL) flow
- Proper line height (2+)

### Color Scheme
- **Primary Green**: #2c5f2d (Islamic theme)
- **Gold Accent**: #d4af37 (Traditional)
- **Cream Background**: #faf8f3 (Easy on eyes)
- **Highlight Yellow**: For search matches

### Layout
- Clean, card-based design
- Three sections: Surah / Search / Ayah
- Loading spinner during requests
- Error messages in red
- Smooth hover effects

## 🔥 Power User Tips

### Console Testing
Open browser console (F12) and try:
```javascript
// Load specific Surah
await quranTester.getSurah(1, 'ar');

// Search programmatically
await quranTester.searchQuran('الله', 'ar', 5);

// Get famous Ayah
await quranTester.getAyah(2, 255, 'ar');
```

### Keyboard Shortcuts
- **Tab**: Navigate between fields
- **Enter**: Submit when in search box
- **Ctrl/Cmd + F**: Browser search in results

### URL Hacking
Test API directly in browser:
```
https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/content/quran/surah/1?lang=ar
https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/content/quran/search?q=الله&lang=ar&limit=5
```

## 📚 Next Steps

1. **Read Full Docs**: Open `QURAN_MODULE_README.md`
2. **Run Test Suite**: Follow `QURAN_TEST_SPECIFICATION.md`
3. **Study Examples**: Check `js/quran-usage-examples.js`
4. **Customize**: Edit CSS variables in `css/quran-module.css`
5. **Integrate**: Use module in your own project

## ✨ Quick Win Checklist

Speed run through features:
- [ ] Open `quran-test.html` (1 min)
- [ ] Load Surah 1 in Arabic (10s)
- [ ] Search for "الله" (10s)
- [ ] Get Ayah 2:255 (10s)
- [ ] Click search result to load Surah (5s)
- [ ] Switch to English and reload (10s)
- [ ] Try on mobile (resize browser) (30s)
- [ ] Check error handling (invalid Surah 200) (10s)

**Total Time**: ~3 minutes to see all features! 🎉

## 🎓 Learning Path

### Beginner (Just use it)
1. Open HTML file
2. Click buttons
3. See results

### Intermediate (Understand it)
1. Open DevTools (F12)
2. Watch Network tab
3. See API calls
4. Read code comments

### Advanced (Extend it)
1. Read full README
2. Study JavaScript module
3. Modify and customize
4. Integrate into project

## 🆘 Need Help?

1. **Console Errors**: Press F12, check Console tab
2. **Network Issues**: Press F12, check Network tab
3. **API Responses**: Click request in Network tab, see Response
4. **Styling Issues**: Press F12, check Elements/Inspector

## 🎯 Success Indicators

You know it's working when:
- ✅ Arabic text appears in beautiful font
- ✅ Text flows right-to-left
- ✅ Search highlights terms in yellow
- ✅ Loading spinner shows during requests
- ✅ Clicking results loads full Surah
- ✅ Mobile view is responsive
- ✅ No console errors (F12)

---

**Ready?** Open `quran-test.html` and start testing! 🚀

**Questions?** Check `QURAN_MODULE_README.md` for detailed documentation.

**Issues?** See `QURAN_TEST_SPECIFICATION.md` for troubleshooting.

---

*Last updated: October 2025*
*Version: 1.0.0*
*Status: Production Ready ✨*
