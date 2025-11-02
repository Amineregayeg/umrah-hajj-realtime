# Qibla Module Integration Examples

This document provides practical examples of how to integrate and use the Qibla Direction module in different scenarios.

## Table of Contents
1. [Basic Integration](#basic-integration)
2. [Custom API Configuration](#custom-api-configuration)
3. [Programmatic Usage](#programmatic-usage)
4. [Event Handling](#event-handling)
5. [Advanced Customization](#advanced-customization)
6. [Multi-Module Integration](#multi-module-integration)

---

## Basic Integration

### Minimal HTML Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Qibla Direction</title>
  <link rel="stylesheet" href="css/qibla-module.css">
</head>
<body>
  <div class="qibla-module">
    <div class="qibla-header">
      <h2>Calculate Qibla Direction</h2>
    </div>

    <div id="errorMessage" class="error-message"></div>
    <div id="loadingIndicator" class="loading-indicator">Calculating...</div>

    <div class="qibla-content">
      <div class="qibla-input-section">
        <h3>Location Coordinates</h3>
        <div class="input-group">
          <label for="latitudeInput">Latitude</label>
          <input type="number" id="latitudeInput" step="0.000001" min="-90" max="90">
        </div>
        <div class="input-group">
          <label for="longitudeInput">Longitude</label>
          <input type="number" id="longitudeInput" step="0.000001" min="-180" max="180">
        </div>
        <div class="button-group">
          <button id="calculateQiblaBtn" class="btn btn-primary">Calculate Qibla</button>
          <button id="useLocationBtn" class="btn btn-secondary">Use My Location</button>
        </div>
      </div>

      <div class="qibla-compass-section">
        <h3>Qibla Compass</h3>
        <div class="compass-container">
          <canvas id="qiblaCompass"></canvas>
        </div>
      </div>
    </div>

    <div id="qiblaResults" class="qibla-results">
      <h3>Results</h3>
      <div class="results-grid">
        <div class="result-item">
          <div class="result-label">Qibla Direction</div>
          <div class="result-value highlight">
            <span id="qiblaDirection">-</span>
          </div>
          <div class="result-label">
            <span id="cardinalDirection">-</span>
          </div>
        </div>
        <div class="result-item">
          <div class="result-label">Distance to Kaaba</div>
          <div class="result-value highlight">
            <span id="qiblaDistance">-</span>
          </div>
        </div>
        <div class="result-item">
          <div class="result-label">Your Location</div>
          <div class="result-value"><span id="userLocation">-</span></div>
        </div>
        <div class="result-item">
          <div class="result-label">Kaaba Location</div>
          <div class="result-value"><span id="kaabaLocation">-</span></div>
        </div>
        <div class="result-item full-width">
          <div class="result-label">Calculated At</div>
          <div class="result-value"><span id="calculatedTimestamp">-</span></div>
        </div>
      </div>
    </div>
  </div>

  <script src="js/qibla-module.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const qiblaTester = new QiblaTester();
      qiblaTester.init();
    });
  </script>
</body>
</html>
```

---

## Custom API Configuration

### Using Different API Endpoints

```javascript
// Production API
const qiblaProduction = new QiblaTester('https://psychological-jilli-amineregayeg-1fe35444.koyeb.app');

// Development API
const qiblaDev = new QiblaTester('http://localhost:3000');

// Staging API
const qiblaStaging = new QiblaTester('https://staging.example.com');

// Initialize
qiblaProduction.init();
```

### Environment-Based Configuration

```javascript
const API_URLS = {
  production: 'https://psychological-jilli-amineregayeg-1fe35444.koyeb.app',
  staging: 'https://staging.example.com',
  development: 'http://localhost:3000'
};

const environment = process.env.NODE_ENV || 'production';
const apiUrl = API_URLS[environment];

const qiblaTester = new QiblaTester(apiUrl);
qiblaTester.init();

console.log(`Qibla module initialized with ${environment} API`);
```

---

## Programmatic Usage

### Calculate Qibla Programmatically

```javascript
const qiblaTester = new QiblaTester();
qiblaTester.init();

// Calculate for specific coordinates
async function checkQiblaForCity(cityName, lat, lng) {
  console.log(`Calculating Qibla for ${cityName}...`);

  try {
    await qiblaTester.calculateQibla(lat, lng);
    console.log(`✓ Qibla calculated for ${cityName}`);
  } catch (error) {
    console.error(`✗ Failed for ${cityName}:`, error);
  }
}

// Example: Calculate for multiple cities
checkQiblaForCity('New York', 40.7128, -74.0060);
checkQiblaForCity('London', 51.5074, -0.1278);
checkQiblaForCity('Tokyo', 35.6762, 139.6503);
```

### Access Results Data

```javascript
// Extend QiblaTester to expose results
class QiblaTesterExtended extends QiblaTester {
  constructor(apiBaseUrl) {
    super(apiBaseUrl);
    this.lastResult = null;
  }

  displayQibla(data) {
    // Store result
    this.lastResult = data;

    // Call parent method
    super.displayQibla(data);

    // Custom callback
    if (this.onResultsReceived) {
      this.onResultsReceived(data);
    }
  }
}

// Usage
const qibla = new QiblaTesterExtended();
qibla.init();

qibla.onResultsReceived = (data) => {
  console.log('Qibla Direction:', data.qibla.direction);
  console.log('Distance:', data.qibla.distance);

  // Send to analytics
  analytics.track('qibla_calculated', {
    direction: data.qibla.direction,
    distance: data.qibla.distance,
    location: data.location
  });
};

qibla.calculateQibla(40.7128, -74.0060);
```

---

## Event Handling

### Custom Event Listeners

```javascript
const qiblaTester = new QiblaTester();
qiblaTester.init();

// Listen for calculation start
document.getElementById('calculateQiblaBtn').addEventListener('click', () => {
  console.log('Calculation started');
  // Show custom loading UI
  showCustomLoader();
});

// Intercept API calls
const originalCalculate = qiblaTester.calculateQibla.bind(qiblaTester);
qiblaTester.calculateQibla = async function(lat, lng) {
  console.log('API call intercepted:', { lat, lng });

  // Pre-processing
  const startTime = performance.now();

  try {
    await originalCalculate(lat, lng);

    // Post-processing
    const duration = performance.now() - startTime;
    console.log(`Calculation completed in ${duration.toFixed(2)}ms`);

  } catch (error) {
    console.error('Calculation failed:', error);
    throw error;
  }
};
```

### Error Handling Customization

```javascript
class QiblaTesterWithCustomErrors extends QiblaTester {
  showError(message) {
    // Custom error handling
    console.error('[Qibla Error]', message);

    // Show custom error modal
    showErrorModal({
      title: 'Qibla Calculation Error',
      message: message,
      icon: 'error'
    });

    // Log to error tracking service
    ErrorTracker.logError('qibla_error', { message });

    // Call parent method
    super.showError(message);
  }
}

const qibla = new QiblaTesterWithCustomErrors();
qibla.init();
```

---

## Advanced Customization

### Custom Compass Styling

```javascript
class CustomStyledQibla extends QiblaTester {
  drawCompass(direction) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Custom gradient background
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#e3f2fd');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw custom compass elements
    this.drawCustomCardinalPoints(centerX, centerY, radius);
    this.drawCustomQiblaArrow(direction, radius);
  }

  drawCustomCardinalPoints(centerX, centerY, radius) {
    // Custom implementation
  }

  drawCustomQiblaArrow(direction, radius) {
    // Custom implementation
  }
}
```

### Multiple Compass Instances

```html
<div class="compass-comparison">
  <div class="compass-item">
    <h4>New York</h4>
    <canvas id="compass1" width="200" height="200"></canvas>
  </div>
  <div class="compass-item">
    <h4>London</h4>
    <canvas id="compass2" width="200" height="200"></canvas>
  </div>
  <div class="compass-item">
    <h4>Tokyo</h4>
    <canvas id="compass3" width="200" height="200"></canvas>
  </div>
</div>

<script>
class MultiCompassManager {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.compasses = [];
  }

  addCompass(canvasId, location) {
    const qibla = new QiblaTester(this.apiUrl);
    qibla.canvas = document.getElementById(canvasId);
    qibla.ctx = qibla.canvas.getContext('2d');

    this.compasses.push({ qibla, location });

    // Calculate immediately
    qibla.calculateQibla(location.lat, location.lng);
  }

  updateAll() {
    this.compasses.forEach(({ qibla, location }) => {
      qibla.calculateQibla(location.lat, location.lng);
    });
  }
}

const manager = new MultiCompassManager('https://psychological-jilli-amineregayeg-1fe35444.koyeb.app');

manager.addCompass('compass1', { lat: 40.7128, lng: -74.0060 });
manager.addCompass('compass2', { lat: 51.5074, lng: -0.1278 });
manager.addCompass('compass3', { lat: 35.6762, lng: 139.6503 });
</script>
```

---

## Multi-Module Integration

### Integrating with Navigation Module

```javascript
// Initialize both modules
const navigationTester = new NavigationTester();
const qiblaTester = new QiblaTester();

navigationTester.init();
qiblaTester.init();

// Sync location between modules
function syncLocationToQibla(location) {
  document.getElementById('latitudeInput').value = location.latitude;
  document.getElementById('longitudeInput').value = location.longitude;
  qiblaTester.calculateQibla(location.latitude, location.longitude);
}

// Example: When user navigates, update Qibla
navigationTester.onLocationUpdate = (location) => {
  syncLocationToQibla(location);
};
```

### Unified Dashboard

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Umrah & Hajj Dashboard</title>
  <link rel="stylesheet" href="css/nav-module.css">
  <link rel="stylesheet" href="css/qibla-module.css">
  <link rel="stylesheet" href="css/quran-module.css">
</head>
<body>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Umrah & Hajj Real-Time System</h1>
    </div>

    <div class="dashboard-grid">
      <!-- Navigation Module -->
      <div class="dashboard-card">
        <div id="navigationModule"></div>
      </div>

      <!-- Qibla Module -->
      <div class="dashboard-card">
        <div id="qiblaModule"></div>
      </div>

      <!-- Quran Module -->
      <div class="dashboard-card">
        <div id="quranModule"></div>
      </div>
    </div>
  </div>

  <script src="js/nav-module.js"></script>
  <script src="js/qibla-module.js"></script>
  <script src="js/quran-module.js"></script>
  <script>
    // Initialize all modules
    const dashboard = {
      navigation: new NavigationTester(),
      qibla: new QiblaTester(),
      quran: new QuranTester()
    };

    Object.values(dashboard).forEach(module => module.init());

    // Cross-module communication
    dashboard.navigation.onLocationUpdate = (location) => {
      dashboard.qibla.calculateQibla(location.latitude, location.longitude);
    };
  </script>
</body>
</html>
```

---

## Real-World Use Cases

### 1. Mobile App Integration

```javascript
// Cordova/PhoneGap example
document.addEventListener('deviceready', () => {
  const qiblaTester = new QiblaTester();
  qiblaTester.init();

  // Use native geolocation
  navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      qiblaTester.calculateQibla(lat, lng);
    },
    (error) => {
      console.error('Geolocation error:', error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 27000
    }
  );
});
```

### 2. Progressive Web App (PWA)

```javascript
// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    console.log('Service Worker registered');
  });
}

// Offline-first Qibla calculator
class OfflineQiblaTester extends QiblaTester {
  async calculateQibla(lat, lng) {
    try {
      // Try online first
      await super.calculateQibla(lat, lng);
    } catch (error) {
      // Fallback to cached calculation
      const cached = await this.getCachedResult(lat, lng);
      if (cached) {
        this.displayQibla(cached);
        this.showInfo('Using cached result (offline mode)');
      } else {
        throw error;
      }
    }
  }

  async getCachedResult(lat, lng) {
    // Implement caching logic
    const cache = await caches.open('qibla-cache');
    const response = await cache.match(`/qibla/${lat}/${lng}`);
    return response ? await response.json() : null;
  }
}
```

### 3. React Integration

```jsx
import React, { useEffect, useRef, useState } from 'react';
import QiblaTester from './js/qibla-module.js';

function QiblaComponent() {
  const qiblaRef = useRef(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    // Initialize Qibla module
    const qibla = new QiblaTester();
    qiblaRef.current = qibla;

    // Override displayQibla to update React state
    const originalDisplay = qibla.displayQibla.bind(qibla);
    qibla.displayQibla = (data) => {
      originalDisplay(data);
      setResults(data);
    };

    qibla.init();

    return () => {
      // Cleanup
      if (qibla.animationFrameId) {
        cancelAnimationFrame(qibla.animationFrameId);
      }
    };
  }, []);

  const handleCalculate = (lat, lng) => {
    if (qiblaRef.current) {
      qiblaRef.current.calculateQibla(lat, lng);
    }
  };

  return (
    <div className="qibla-component">
      <canvas id="qiblaCompass" />
      {results && (
        <div className="results">
          <p>Direction: {results.qibla.direction}°</p>
          <p>Distance: {results.qibla.distance} km</p>
        </div>
      )}
    </div>
  );
}

export default QiblaComponent;
```

---

## Testing & Debugging

### Console Debugging

```javascript
const qiblaTester = new QiblaTester();
qiblaTester.init();

// Expose to window for console access
window.qibla = qiblaTester;

// Console usage:
// qibla.calculateQibla(40.7128, -74.0060)
// qibla.currentDirection
// qibla.lastResult
```

### Performance Monitoring

```javascript
class MonitoredQiblaTester extends QiblaTester {
  async calculateQibla(lat, lng) {
    const metrics = {
      startTime: performance.now(),
      coordinates: { lat, lng }
    };

    try {
      await super.calculateQibla(lat, lng);
      metrics.duration = performance.now() - metrics.startTime;
      metrics.success = true;
    } catch (error) {
      metrics.duration = performance.now() - metrics.startTime;
      metrics.success = false;
      metrics.error = error.message;
    }

    // Log metrics
    console.log('Performance Metrics:', metrics);

    // Send to analytics
    if (window.analytics) {
      analytics.track('qibla_calculation', metrics);
    }
  }
}
```

---

**Happy Integrating!** 🧭

For more examples and documentation, see:
- [README.md](./README.md) - Full documentation
- [QIBLA_QUICK_START.md](./QIBLA_QUICK_START.md) - Quick start guide
- [QIBLA_MODULE_SPEC.md](./QIBLA_MODULE_SPEC.md) - Technical specification
