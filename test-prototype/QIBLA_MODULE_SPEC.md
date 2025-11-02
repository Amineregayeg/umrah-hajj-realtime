# Qibla Module Technical Specification

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                    Qibla Direction Tester                       │
│          Testing Interface for Umrah & Hajj Backend API         │
│      API: psychological-jilli-amineregayeg-1fe35444.koyeb.app   │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬───────────────────────────────┐
│  Location Coordinates         │   Qibla Compass               │
├───────────────────────────────┼───────────────────────────────┤
│                               │                               │
│  Latitude                     │         N                     │
│  ┌─────────────────────────┐ │        ╱│╲                    │
│  │ 40.7128                 │ │       ╱ │ ╲                   │
│  └─────────────────────────┘ │      ╱  │  ╲                  │
│  Range: -90 to 90 degrees    │     ╱   │   ╲                 │
│                               │    ╱    │    ╲                │
│  Longitude                    │   ╱     │     ╲               │
│  ┌─────────────────────────┐ │  W ─────●───── E             │
│  │ -74.0060                │ │   ╲     ↑     ╱               │
│  └─────────────────────────┘ │    ╲    │    ╱                │
│  Range: -180 to 180 degrees  │     ╲   │   ╱                 │
│                               │      ╲  │  ╱                  │
│  ┌─────────────────────────┐ │       ╲ │ ╱                   │
│  │  CALCULATE QIBLA        │ │        ╲│╱                    │
│  └─────────────────────────┘ │         S                     │
│  ┌─────────────────────────┐ │                               │
│  │  USE MY LOCATION        │ │  ◼ Qibla Direction            │
│  └─────────────────────────┘ │  ◼ Opposite Direction         │
└───────────────────────────────┴───────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Calculation Results                                            │
├──────────────────────────────┬──────────────────────────────────┤
│  QIBLA DIRECTION             │  DISTANCE TO KAABA               │
│  58.48°                      │  9842.5 km                       │
│  North-East                  │                                  │
├──────────────────────────────┼──────────────────────────────────┤
│  YOUR LOCATION               │  KAABA LOCATION                  │
│  40.712800°, -74.006000°     │  21.422500°, 39.826200°          │
├──────────────────────────────┴──────────────────────────────────┤
│  CALCULATED AT                                                  │
│  10/17/2025, 12:34:56 PM                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Header Section
- **Title:** "Qibla Direction Tester"
- **Subtitle:** Backend API information
- **Badge:** API URL display
- **Style:** Gradient purple background, white text

### 2. Input Section (Left Panel)
- **Width:** 50% on desktop, 100% on mobile
- **Background:** White card with shadow
- **Components:**
  - Latitude input field (number, -90 to 90)
  - Longitude input field (number, -180 to 180)
  - Calculate Qibla button (green gradient)
  - Use My Location button (blue gradient)
- **Validation:** Real-time error messages

### 3. Compass Section (Right Panel)
- **Width:** 50% on desktop, 100% on mobile
- **Background:** White card with shadow
- **Components:**
  - Canvas element (300x300px)
  - Compass circle with border
  - Cardinal directions (N, S, E, W)
  - Intercardinal directions (NE, SE, SW, NW)
  - Degree markers every 30°
  - Green Qibla arrow
  - Red opposite direction indicator
  - Legend with color codes

### 4. Results Section (Full Width)
- **Display:** Hidden until calculation completes
- **Animation:** Fade in from top
- **Layout:** 2-column grid (responsive)
- **Cards:**
  1. Qibla Direction (large green text)
  2. Distance to Kaaba (large green text)
  3. User Location coordinates
  4. Kaaba Location coordinates
  5. Calculation timestamp (full width)

### 5. Information Section
- **Background:** Light green
- **Border:** Green left border
- **Content:**
  - About Qibla direction
  - Testing instructions
  - Example locations

## Color Scheme

```css
Primary Green:   #28a745  /* Success, Qibla direction */
Secondary Blue:  #007bff  /* Location button */
Dark Gray:       #2c3e50  /* Headings, text */
Light Gray:      #f8f9fa  /* Backgrounds */
Error Red:       #c62828  /* Error messages */
Opposite Red:    #dc3545  /* Opposite direction */
Border Gray:     #e0e0e0  /* Input borders */
```

## Typography

```
Headings:     'Segoe UI', sans-serif, 20-36px, Bold
Body Text:    'Segoe UI', sans-serif, 14-16px, Regular
Labels:       'Segoe UI', sans-serif, 13-14px, Semi-Bold
Results:      'Segoe UI', sans-serif, 20-24px, Bold
Canvas Text:  'Arial', sans-serif, 14-20px, Bold
```

## Spacing & Layout

```
Container Max Width:  1200px
Card Padding:         25px
Grid Gap:             30px
Input Height:         48px
Button Height:        48px
Border Radius:        8-12px
Box Shadow:           0 2px 8px rgba(0,0,0,0.1)
```

## Interactions

### 1. Button States
```
Default:  Gradient background, white text
Hover:    Darker gradient, lift 2px, shadow
Active:   No lift, pressed state
Disabled: 60% opacity, no hover effect
```

### 2. Input States
```
Default:  Gray border, white background
Focus:    Green border, green shadow
Error:    Red border, red background tint
```

### 3. Animations
```
Compass Rotation:    1000ms ease-in-out
Results Fade In:     500ms ease
Button Hover:        300ms ease
Error Shake:         300ms ease
```

## Responsive Breakpoints

```css
Desktop:  > 768px  (2-column layout)
Tablet:   ≤ 768px  (1-column layout)
Mobile:   ≤ 480px  (Compressed padding, smaller compass)
```

### Layout Changes

**Desktop (> 768px):**
- Input section: Left 50%
- Compass section: Right 50%
- Results: 2-column grid
- Compass: 300x300px

**Tablet (≤ 768px):**
- Input section: Full width
- Compass section: Full width (stacked)
- Results: 1-column grid
- Compass: 250x250px

**Mobile (≤ 480px):**
- Reduced padding (15px)
- Buttons: Full width, stacked
- Compass: 200x200px
- Smaller fonts

## API Integration

### Endpoint
```
GET https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/content/qibla
```

### Query Parameters
```
lat  (required): Latitude (-90 to 90)
lng  (required): Longitude (-180 to 180)
```

### Request Headers
```
Accept: application/json
```

### Response Format
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

### Error Handling
```javascript
// Network errors
catch (error) {
  showError(`Failed to calculate Qibla: ${error.message}`);
}

// HTTP errors
if (!response.ok) {
  throw new Error(`API request failed with status ${response.status}`);
}

// Validation errors
if (!data || !data.qibla) {
  showError('Invalid response from API');
}
```

## Compass Drawing Algorithm

### Coordinate System
```
Canvas:     300x300 pixels
Center:     (150, 150)
Radius:     130 pixels (from center to edge)
```

### Drawing Order
1. **Background Circle**
   - Fill: Light gray (#f8f9fa)
   - Stroke: Dark gray (#333), 3px

2. **Degree Markers**
   - Every 30° around circle
   - 10px lines at radius
   - Gray color (#666), 2px

3. **Cardinal Directions**
   - N, S, E, W at radius - 25px
   - Bold 20px Arial
   - Dark gray (#333)

4. **Intercardinal Directions**
   - NE, SE, SW, NW at 45° angles
   - Bold 14px Arial
   - Medium gray (#666)

5. **Center Circle**
   - 8px radius
   - Filled dark gray (#333)

6. **Qibla Arrow**
   - Rotate canvas to direction angle
   - Green shaft (#28a745), 4px, to radius - 40px
   - Green triangle head at end
   - Red tail shaft opposite direction

7. **Direction Label**
   - Bottom center of canvas
   - Bold 16px Arial
   - Green color (#28a745)
   - Shows direction in degrees

### Rotation Animation
```javascript
// Easing function
progress < 0.5
  ? 2 * progress * progress
  : 1 - Math.pow(-2 * progress + 2, 2) / 2

// Shortest path calculation
diff = targetDirection - currentDirection
if (diff > 180) diff -= 360
if (diff < -180) diff += 360

// Smooth interpolation
currentDirection = start + (diff * easeProgress)
```

## Browser API Usage

### Geolocation API
```javascript
navigator.geolocation.getCurrentPosition(
  successCallback,
  errorCallback,
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
)
```

### Fetch API
```javascript
fetch(url, {
  method: 'GET',
  headers: { 'Accept': 'application/json' }
})
```

### Canvas API
```javascript
const ctx = canvas.getContext('2d');
ctx.translate(x, y);
ctx.rotate(angle);
ctx.beginPath();
ctx.arc(x, y, radius, start, end);
```

### RequestAnimationFrame
```javascript
const animate = (timestamp) => {
  // Update state
  // Redraw canvas
  if (progress < 1) {
    requestAnimationFrame(animate);
  }
};
```

## Accessibility Features

### Keyboard Navigation
- Tab order: Latitude → Longitude → Calculate → Use Location
- Enter key triggers calculation
- Escape clears errors

### ARIA Labels
```html
<input aria-label="Latitude coordinate">
<button aria-label="Calculate Qibla direction">
<canvas aria-label="Qibla direction compass">
```

### Screen Reader Support
- Semantic HTML structure
- Descriptive labels
- Status messages announced
- Result values readable

### Visual Accessibility
- High contrast colors (4.5:1 minimum)
- Focus indicators (3px outline)
- Large touch targets (48px minimum)
- Sufficient spacing (8-20px gaps)

## Performance Considerations

### Optimization Techniques
1. **Canvas Rendering**
   - Hardware accelerated
   - Only redraw on changes
   - Use requestAnimationFrame

2. **API Calls**
   - Single request per calculation
   - 10-second timeout
   - Proper error handling

3. **DOM Manipulation**
   - Minimal during animation
   - Batch updates
   - Use CSS transforms

4. **Memory Management**
   - Cancel animation frames on reset
   - Clear canvas before redraw
   - No memory leaks

### Performance Metrics
- First paint: < 100ms
- Interactive: < 500ms
- API response: < 2s
- Animation: 60 FPS
- Memory: < 50MB

## Testing Requirements

### Unit Tests
- ✓ Coordinate validation
- ✓ API request formatting
- ✓ Response parsing
- ✓ Direction calculation verification
- ✓ Cardinal direction mapping

### Integration Tests
- ✓ API endpoint connectivity
- ✓ Response structure validation
- ✓ Error handling flows
- ✓ Geolocation integration

### UI Tests
- ✓ Input field validation
- ✓ Button click handlers
- ✓ Compass rendering
- ✓ Results display
- ✓ Error messages

### Browser Tests
- ✓ Chrome 90+
- ✓ Firefox 88+
- ✓ Safari 14+
- ✓ Edge 90+
- ✓ Mobile browsers

## Security Considerations

### Input Validation
- Client-side: Coordinate ranges
- Server-side: Re-validation required
- XSS prevention: No innerHTML usage
- Injection protection: Parameterized queries

### API Security
- HTTPS only
- CORS headers required
- Rate limiting (backend)
- No sensitive data in URLs

### Privacy
- No coordinate storage
- No tracking cookies
- Geolocation permission required
- Clear user consent

## Future Enhancements

### Planned Features
1. Save favorite locations
2. Prayer times integration
3. Multiple location comparison
4. Export results as image
5. Offline mode with service worker
6. 3D compass visualization
7. AR compass overlay
8. Historical calculation log

### Technical Improvements
1. Progressive Web App (PWA)
2. WebGL for 3D compass
3. WebAssembly for calculations
4. Service Worker caching
5. IndexedDB storage
6. Push notifications
7. Background sync

---

**Document Version:** 1.0.0
**Last Updated:** October 17, 2025
**Status:** Production Ready
