# Qibla Direction Testing Module

A comprehensive HTML/CSS/JavaScript testing interface for the Umrah & Hajj backend's Qibla direction calculation API.

## Overview

This module provides a complete, production-ready interface for testing the Qibla direction calculation endpoint with:
- Interactive coordinate input
- Browser geolocation integration
- Animated visual compass
- Real-time API testing
- Comprehensive error handling

## Backend API

**Base URL:** `https://psychological-jilli-amineregayeg-1fe35444.koyeb.app`

**Endpoint:** `GET /content/qibla?lat={latitude}&lng={longitude}`

**Response Format:**
```json
{
  "location": { "latitude": 40.7128, "longitude": -74.0060 },
  "qibla": {
    "direction": 58.48,
    "distance": 9842.5
  },
  "kaaba": { "latitude": 21.4225, "longitude": 39.8262 },
  "calculatedAt": "2025-10-17T..."
}
```

## Files Structure

```
test-prototype/
├── qibla-test.html           # Main HTML interface
├── css/
│   └── qibla-module.css      # Complete styling
├── js/
│   └── qibla-module.js       # QiblaTester class
└── README.md                 # This file
```

## Features

### 1. Coordinate Input
- Manual latitude/longitude entry with validation
- Input validation: lat (-90 to 90), lng (-180 to 180)
- Real-time error messages for invalid coordinates
- Keyboard support (Enter key to calculate)

### 2. Geolocation Integration
- "Use My Location" button for automatic coordinate detection
- Handles permission requests and errors
- High-accuracy GPS positioning
- Error handling for denied permissions

### 3. Visual Compass
- HTML5 Canvas-based compass (300x300px)
- Cardinal directions (N, S, E, W)
- Intercardinal directions (NE, SE, SW, NW)
- Degree markers every 30°
- Green arrow pointing to Qibla
- Red tail showing opposite direction
- Smooth rotation animation (1-second easing)

### 4. Results Display
- Qibla direction in degrees
- Cardinal direction helper (e.g., "North-East")
- Distance to Kaaba in kilometers
- User coordinates
- Kaaba coordinates
- Calculation timestamp

### 5. Error Handling
- API request failures
- Network errors
- Invalid coordinates
- Geolocation permission denied
- Timeout handling

## Usage

### Opening the Interface

1. **Direct File Access:**
   ```bash
   # Navigate to the directory
   cd /mnt/d/umrah-hajj-realtime/test-prototype/

   # Open in browser (Windows)
   start qibla-test.html

   # Open in browser (Linux)
   xdg-open qibla-test.html

   # Open in browser (macOS)
   open qibla-test.html
   ```

2. **Using a Local Server (Recommended):**
   ```bash
   # Using Python 3
   python3 -m http.server 8080

   # Then open: http://localhost:8080/qibla-test.html
   ```

### Testing the API

#### Method 1: Manual Coordinates
1. Enter latitude in the first input field (e.g., `40.7128`)
2. Enter longitude in the second input field (e.g., `-74.0060`)
3. Click "Calculate Qibla" button
4. View results and watch compass animation

#### Method 2: Browser Geolocation
1. Click "Use My Location" button
2. Allow location access when prompted
3. Coordinates auto-populate and calculation runs
4. View results and compass

### Example Locations

| City | Latitude | Longitude | Expected Direction |
|------|----------|-----------|-------------------|
| New York, USA | 40.7128 | -74.0060 | ~58° (NE) |
| London, UK | 51.5074 | -0.1278 | ~118° (SE) |
| Tokyo, Japan | 35.6762 | 139.6503 | ~293° (NW) |
| Sydney, Australia | -33.8688 | 151.2093 | ~277° (W) |
| São Paulo, Brazil | -23.5505 | -46.6333 | ~72° (E) |
| Dubai, UAE | 25.2048 | 55.2708 | ~259° (W) |

## Code Documentation

### JavaScript Class: `QiblaTester`

#### Constructor
```javascript
const qiblaTester = new QiblaTester(apiBaseUrl);
```
- **apiBaseUrl** (string): Backend API base URL

#### Methods

**`init()`**
- Initializes the module after DOM is loaded
- Sets up canvas and event listeners
- Draws initial compass

**`calculateQibla(lat, lng)`**
- Validates coordinates
- Calls backend API
- Displays results and animates compass
- Handles errors

**`useCurrentLocation()`**
- Requests browser geolocation
- Populates input fields
- Automatically calculates Qibla

**`displayQibla(data)`**
- Parses API response
- Updates results display
- Triggers compass animation

**`drawCompass(direction)`**
- Renders compass on canvas
- Draws cardinal/intercardinal directions
- Draws Qibla arrow at specified direction

**`animateCompassNeedle(targetDirection)`**
- Smoothly animates compass from current to target direction
- Uses easing function for natural motion
- 1-second animation duration

**`validateCoordinates(lat, lng)`**
- Validates latitude (-90 to 90)
- Validates longitude (-180 to 180)
- Returns validation result object

## Styling Features

### Responsive Design
- Desktop: Two-column layout (input | compass)
- Tablet: Single column layout
- Mobile: Optimized for small screens
- Compass scales appropriately

### Accessibility
- ARIA labels on interactive elements
- Focus indicators for keyboard navigation
- High contrast mode support
- Screen reader friendly

### Visual Design
- Modern gradient backgrounds
- Smooth animations and transitions
- Professional color scheme
- Clear visual hierarchy

## Browser Compatibility

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- HTML5 Canvas
- ES6 JavaScript (Classes, Arrow Functions, Async/Await)
- CSS Grid and Flexbox
- Geolocation API (optional)
- Fetch API

## Testing Checklist

### Functional Tests
- [ ] Manual coordinate entry works
- [ ] "Use My Location" button functions
- [ ] API requests succeed
- [ ] Results display correctly
- [ ] Compass animates smoothly
- [ ] Error messages show for invalid input

### Edge Cases
- [ ] Latitude = 90 (North Pole)
- [ ] Latitude = -90 (South Pole)
- [ ] Longitude = 180 (International Date Line)
- [ ] Longitude = -180 (International Date Line)
- [ ] Location at Kaaba (21.4225, 39.8262)
- [ ] Invalid coordinates (e.g., lat = 100)
- [ ] Network errors (offline)
- [ ] API errors (500, 404)

### Browser Tests
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Safari desktop
- [ ] Chrome mobile
- [ ] Safari mobile

### Geolocation Tests
- [ ] Permission granted
- [ ] Permission denied
- [ ] Timeout handling
- [ ] Position unavailable

## Troubleshooting

### Issue: Compass not displaying
**Solution:** Check browser console for errors. Ensure canvas element exists and JavaScript is loaded.

### Issue: Geolocation not working
**Solution:**
- Use HTTPS or localhost (required for geolocation)
- Check browser location permissions
- Try incognito mode

### Issue: API requests failing
**Solution:**
- Verify backend is running at specified URL
- Check browser network tab for CORS errors
- Verify coordinates are valid

### Issue: Compass animation jerky
**Solution:**
- Check browser performance
- Ensure requestAnimationFrame is supported
- Try reducing canvas size on lower-end devices

## Customization

### Changing API URL
Edit `qibla-test.html`:
```javascript
const qiblaTester = new QiblaTester('YOUR_API_URL_HERE');
```

### Adjusting Compass Size
Edit `css/qibla-module.css`:
```css
#qiblaCompass {
  width: 400px;  /* Change from 300px */
  height: 400px;
}
```

### Modifying Animation Speed
Edit `js/qibla-module.js` in `animateCompassNeedle()`:
```javascript
const duration = 2000; // Change from 1000 (2 seconds)
```

### Changing Color Scheme
Edit `css/qibla-module.css`:
```css
.btn-primary {
  background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
}
```

## Performance Considerations

- Canvas rendering is hardware-accelerated
- Animation uses `requestAnimationFrame` for optimal performance
- API requests include proper caching headers
- Minimal DOM manipulation during animation
- Responsive images and lazy loading ready

## Security Notes

- Input validation on client side (re-validated on server)
- No storage of user coordinates
- HTTPS recommended for geolocation
- No third-party dependencies
- XSS protection through proper sanitization

## Future Enhancements

Potential additions:
- [ ] Save favorite locations
- [ ] Prayer times integration
- [ ] Multiple location comparison
- [ ] Export results as image
- [ ] Offline mode with service worker
- [ ] 3D compass visualization
- [ ] AR compass overlay

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Review this README
4. Check backend API documentation

## License

Part of the Umrah & Hajj Real-Time Navigation System.

---

**Last Updated:** October 17, 2025
**Version:** 1.0.0
**Author:** Backend Testing Team
