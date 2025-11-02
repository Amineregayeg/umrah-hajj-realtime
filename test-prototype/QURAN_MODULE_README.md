# Quran Module Testing Interface

A complete, production-ready HTML/CSS/JavaScript testing interface for the Umrah & Hajj Backend Quran API endpoints.

## Overview

This module provides a comprehensive interface for testing all Quran-related API functionality including:
- Fetching complete Surahs (1-114)
- Full-text search across the Quran
- Retrieving specific Ayahs by reference
- Proper Arabic text rendering with RTL support
- Bilingual support (Arabic & English)

## Files

```
test-prototype/
├── quran-test.html              # Main HTML test page
├── js/
│   └── quran-module.js          # Complete JavaScript module
├── css/
│   └── quran-module.css         # Comprehensive styling
└── QURAN_MODULE_README.md       # This file
```

## Quick Start

### 1. Open the Test Interface

Simply open `quran-test.html` in a modern web browser:

```bash
# Navigate to the directory
cd /mnt/d/umrah-hajj-realtime/test-prototype/

# Open in browser (choose your preferred method)
# Linux with WSL:
explorer.exe quran-test.html

# Or use a local server:
python3 -m http.server 8000
# Then visit: http://localhost:8000/quran-test.html
```

### 2. Test the Features

The interface provides three main testing sections:

#### A. Get Complete Surah
1. Select a Surah from the dropdown (all 114 Surahs available)
2. Choose language (Arabic or English)
3. Click "Get Surah"
4. View the complete Surah with proper formatting

#### B. Search Quran
1. Enter a search query (Arabic or English text)
2. Select search language
3. Set result limit (1-100)
4. Click "Search"
5. View highlighted results
6. Click any result to load the full Surah

#### C. Get Specific Ayah
1. Enter Surah number (1-114)
2. Enter Ayah number
3. Choose language
4. Click "Get Ayah"
5. View the specific Ayah with metadata

## API Endpoints

### Backend URL
```
https://psychological-jilli-amineregayeg-1fe35444.koyeb.app
```

### Endpoints Used

1. **Get Surah**
   ```
   GET /content/quran/surah/:id?lang=ar|en
   ```
   - Returns complete Surah with all Ayahs
   - Supports Arabic (ar) and English (en) languages

2. **Search Quran**
   ```
   GET /content/quran/search?q=QUERY&lang=ar|en&limit=10
   ```
   - Full-text search across Quran
   - Returns matching Ayahs with context
   - Configurable result limit

3. **Get Ayah**
   ```
   GET /content/quran/ayah?surah=X&ayah=Y&lang=ar
   ```
   - Get specific Ayah by reference
   - Returns single Ayah with metadata

## Features

### Arabic Text Support
- **Fonts**: Uses traditional Islamic fonts (Scheherazade New, Amiri)
- **Direction**: Proper right-to-left (RTL) text rendering
- **Typography**: Large, readable Arabic text with appropriate line height
- **Bismillah**: Automatically displayed for all Surahs except At-Tawbah (Surah 9)

### User Experience
- **Loading States**: Visual spinner during API requests
- **Error Handling**: User-friendly error messages
- **Search Highlighting**: Matched terms highlighted in yellow
- **Clickable Results**: Click search results to load full Surah
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Accessibility**: Keyboard navigation, screen reader support, high contrast mode

### Design
- **Islamic Aesthetics**: Traditional green and gold color scheme
- **Clean Layout**: Modern, card-based interface
- **Smooth Animations**: Subtle hover effects and transitions
- **Print Support**: Optimized for printing Ayahs

## Code Structure

### JavaScript Module (`quran-module.js`)

```javascript
class QuranTester {
  constructor(apiClient)           // Initialize with API client
  init()                          // Set up DOM and event listeners

  // API Methods
  getSurah(id, lang)              // Fetch complete Surah
  searchQuran(query, lang, limit) // Search Quran text
  getAyah(surah, ayah, lang)      // Get specific Ayah

  // Display Methods
  displaySurah(data, lang)        // Render Surah with formatting
  displaySearchResults(data, query, lang) // Render search results
  displayAyah(data, lang)         // Render single Ayah

  // Utility Methods
  highlightText(text, query)      // Highlight search matches
  displayError(element, message)  // Show error messages
  showLoading() / hideLoading()   // Loading indicator control
}
```

### CSS Styling (`quran-module.css`)

- **CSS Variables**: Centralized theming and colors
- **Responsive Design**: Mobile-first approach with breakpoints
- **Arabic Typography**: Custom fonts and text rendering
- **Component Styles**: Modular styling for each UI element
- **Accessibility**: Focus states, high contrast support, reduced motion

## Usage Examples

### Example 1: Load Al-Fatihah (First Surah)

```javascript
// Select Surah 1 from dropdown
document.getElementById('surah-select').value = '1';

// Select Arabic
document.getElementById('surah-lang-select').value = 'ar';

// Click get button or call directly
await quranTester.getSurah(1, 'ar');
```

### Example 2: Search for "Prayer"

```javascript
// Set search query
document.getElementById('search-query').value = 'prayer';

// Set language to English
document.getElementById('search-lang-select').value = 'en';

// Search
await quranTester.searchQuran('prayer', 'en', 10);
```

### Example 3: Get Ayat al-Kursi (2:255)

```javascript
// Set Surah and Ayah
document.getElementById('ayah-surah').value = '2';
document.getElementById('ayah-number').value = '255';

// Get Ayah
await quranTester.getAyah(2, 255, 'ar');
```

## Customization

### Changing Colors

Edit CSS variables in `quran-module.css`:

```css
:root {
  --primary-color: #2c5f2d;      /* Main green */
  --secondary-color: #d4af37;    /* Gold accent */
  --accent-color: #8b7355;       /* Brown accent */
  /* ... more variables */
}
```

### Adding New Features

1. Add HTML elements to `quran-test.html`
2. Create method in `QuranTester` class
3. Add styling to `quran-module.css`
4. Set up event listeners in `init()` method

### Integrating with Your Project

```html
<!-- Include CSS -->
<link rel="stylesheet" href="css/quran-module.css">

<!-- Include JS -->
<script src="js/quran-module.js"></script>

<!-- Initialize -->
<script>
  const apiClient = new ApiClient('YOUR_API_URL');
  const quranTester = new QuranTester(apiClient);
  quranTester.init();
</script>
```

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 12+)
- **Mobile Browsers**: Fully responsive

## Technical Details

### Dependencies
- **None** - Pure vanilla JavaScript (ES6+)
- Google Fonts for Arabic typography (optional, has fallbacks)

### API Client
Simple fetch-based client included in HTML file:
```javascript
class ApiClient {
  async get(endpoint) {
    // Makes GET requests with proper headers
    // Handles errors and returns JSON
  }
}
```

### Error Handling
- Network errors caught and displayed
- API errors parsed and shown to user
- Loading states prevent duplicate requests
- Validation for required fields

## Testing Checklist

- [ ] Get Surah in Arabic (test with Surah 1)
- [ ] Get Surah in English (test with any Surah)
- [ ] Search in Arabic (try "الله")
- [ ] Search in English (try "God" or "prayer")
- [ ] Get specific Ayah (try 2:255 - Ayat al-Kursi)
- [ ] Test with invalid inputs (empty fields, out-of-range numbers)
- [ ] Test responsive design (resize browser window)
- [ ] Test on mobile device
- [ ] Verify Arabic RTL rendering
- [ ] Check search result highlighting
- [ ] Click search results to load Surah
- [ ] Test loading indicators
- [ ] Test error messages (try invalid Surah number like 200)

## Troubleshooting

### Issue: API requests fail
**Solution**: Check that the backend URL is correct and accessible:
```javascript
const API_BASE_URL = 'https://psychological-jilli-amineregayeg-1fe35444.koyeb.app';
```

### Issue: Arabic text not displaying correctly
**Solution**: Ensure Google Fonts are loading or install Arabic fonts locally

### Issue: No response from API
**Solution**:
1. Check browser console for errors (F12)
2. Verify CORS headers on backend
3. Test API endpoint directly in browser

### Issue: Search not working
**Solution**:
1. Ensure search query is not empty
2. Check that language parameter matches text (ar for Arabic, en for English)
3. Verify result limit is reasonable (1-100)

## Performance Considerations

- **Lazy Loading**: Only loads data when requested
- **Caching**: Browser caches API responses
- **Optimized CSS**: Uses modern CSS features for performance
- **No Heavy Dependencies**: Pure vanilla JS for fast load times

## Future Enhancements

Potential features to add:
- [ ] Audio recitation integration
- [ ] Bookmarking favorite Ayahs
- [ ] Export/share functionality
- [ ] Advanced search filters
- [ ] Multiple translation comparison
- [ ] Tafsir (commentary) integration
- [ ] Progress tracking
- [ ] Dark mode

## Support

For issues or questions:
1. Check browser console (F12) for error messages
2. Verify API endpoint URLs
3. Review the code comments in `quran-module.js`
4. Test with simple queries first (e.g., Surah 1)

## License

This module is part of the Umrah & Hajj Realtime project.

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Status**: Production Ready
