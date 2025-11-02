/**
 * Qibla Direction Testing Module
 *
 * This module provides a complete interface for testing the Qibla direction API
 * from the Umrah & Hajj backend. It includes geolocation support, API integration,
 * and a visual compass representation.
 *
 * Backend API: https://psychological-jilli-amineregayeg-1fe35444.koyeb.app
 */

class QiblaTester {
  /**
   * Initialize the QiblaTester with API configuration
   * @param {string} apiBaseUrl - Base URL for the backend API
   */
  constructor(apiBaseUrl = 'https://psychological-jilli-amineregayeg-1fe35444.koyeb.app') {
    this.apiBaseUrl = apiBaseUrl;
    this.canvas = null;
    this.ctx = null;
    this.currentDirection = 0;
    this.animationFrameId = null;
    this.watchId = null;
    this.isTracking = false;

    // Bind methods to ensure correct 'this' context
    this.calculateQibla = this.calculateQibla.bind(this);
    this.useCurrentLocation = this.useCurrentLocation.bind(this);
    this.displayQibla = this.displayQibla.bind(this);
    this.drawCompass = this.drawCompass.bind(this);
    this.animateCompassNeedle = this.animateCompassNeedle.bind(this);
    this.startLiveTracking = this.startLiveTracking.bind(this);
    this.stopLiveTracking = this.stopLiveTracking.bind(this);
  }

  /**
   * Initialize the module with DOM elements
   * Should be called after DOM is loaded
   */
  init() {
    // Get canvas element and context
    this.canvas = document.getElementById('qiblaCompass');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      // Set canvas size
      this.canvas.width = 300;
      this.canvas.height = 300;
      // Draw initial compass
      this.drawCompass(0);
    }

    // Setup event listeners
    this.setupEventListeners();

    console.log('QiblaTester initialized');
  }

  /**
   * Setup event listeners for user interactions
   */
  setupEventListeners() {
    const calculateBtn = document.getElementById('calculateQiblaBtn');
    const locationBtn = document.getElementById('useLocationBtn');
    const latInput = document.getElementById('latitudeInput');
    const lngInput = document.getElementById('longitudeInput');

    if (calculateBtn) {
      calculateBtn.addEventListener('click', () => {
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);
        this.calculateQibla(lat, lng);
      });
    }

    if (locationBtn) {
      locationBtn.addEventListener('click', this.useCurrentLocation);
    }

    // Allow Enter key to trigger calculation
    if (latInput && lngInput) {
      [latInput, lngInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);
            this.calculateQibla(lat, lng);
          }
        });
      });
    }
  }

  /**
   * Validate latitude and longitude coordinates
   * @param {number} lat - Latitude value
   * @param {number} lng - Longitude value
   * @returns {Object} Validation result with isValid flag and error message
   */
  validateCoordinates(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) {
      return {
        isValid: false,
        error: 'Please enter valid numeric values for latitude and longitude'
      };
    }

    if (lat < -90 || lat > 90) {
      return {
        isValid: false,
        error: 'Latitude must be between -90 and 90 degrees'
      };
    }

    if (lng < -180 || lng > 180) {
      return {
        isValid: false,
        error: 'Longitude must be between -180 and 180 degrees'
      };
    }

    return { isValid: true };
  }

  /**
   * Calculate Qibla direction by calling the backend API
   * @param {number} lat - Latitude of the location
   * @param {number} lng - Longitude of the location
   */
  async calculateQibla(lat, lng) {
    // Validate coordinates
    const validation = this.validateCoordinates(lat, lng);
    if (!validation.isValid) {
      this.showError(validation.error);
      return;
    }

    // Show loading state
    this.showLoading(true);
    this.clearError();

    try {
      // Construct API URL
      const url = `${this.apiBaseUrl}/content/qibla?lat=${lat}&lng=${lng}`;

      console.log('Calling Qibla API:', url);

      // Make API request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      // Parse response
      const data = await response.json();
      console.log('Qibla API response:', data);

      // Display results
      this.displayQibla(data);

    } catch (error) {
      console.error('Error calculating Qibla:', error);
      this.showError(`Failed to calculate Qibla direction: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Use browser's geolocation API to get current location
   */
  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.showError('Geolocation is not supported by your browser');
      return;
    }

    this.showLoading(true);
    this.clearError();

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        console.log('Current location:', { lat, lng });

        // Update input fields
        document.getElementById('latitudeInput').value = lat.toFixed(6);
        document.getElementById('longitudeInput').value = lng.toFixed(6);

        // Calculate Qibla for current location
        this.calculateQibla(lat, lng);
      },
      (error) => {
        this.showLoading(false);
        let errorMessage = 'Unable to retrieve your location';

        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        this.showError(errorMessage);
      },
      options
    );
  }

  /**
   * Display Qibla direction results
   * @param {Object} data - API response data
   */
  displayQibla(data) {
    if (!data || !data.qibla) {
      this.showError('Invalid response from API');
      return;
    }

    const { location, qibla, kaaba, calculatedAt } = data;

    // Display direction and distance
    const directionElement = document.getElementById('qiblaDirection');
    const distanceElement = document.getElementById('qiblaDistance');
    const locationElement = document.getElementById('userLocation');
    const kaabaElement = document.getElementById('kaabaLocation');
    const timestampElement = document.getElementById('calculatedTimestamp');

    if (directionElement) {
      directionElement.textContent = `${qibla.direction.toFixed(2)}°`;
    }

    if (distanceElement) {
      distanceElement.textContent = `${qibla.distance.toFixed(2)} km`;
    }

    if (locationElement) {
      locationElement.textContent = `${location.latitude.toFixed(6)}°, ${location.longitude.toFixed(6)}°`;
    }

    if (kaabaElement) {
      kaabaElement.textContent = `${kaaba.latitude.toFixed(6)}°, ${kaaba.longitude.toFixed(6)}°`;
    }

    if (timestampElement) {
      const date = new Date(calculatedAt);
      timestampElement.textContent = date.toLocaleString();
    }

    // Show results container
    const resultsContainer = document.getElementById('qiblaResults');
    if (resultsContainer) {
      resultsContainer.style.display = 'block';
    }

    // Animate compass to show direction
    this.animateCompassNeedle(qibla.direction);

    // Display cardinal direction helper
    this.displayCardinalDirection(qibla.direction);
  }

  /**
   * Display cardinal direction helper text
   * @param {number} direction - Direction in degrees
   */
  displayCardinalDirection(direction) {
    const cardinalElement = document.getElementById('cardinalDirection');
    if (!cardinalElement) return;

    let cardinal = '';

    if (direction >= 337.5 || direction < 22.5) cardinal = 'North';
    else if (direction >= 22.5 && direction < 67.5) cardinal = 'North-East';
    else if (direction >= 67.5 && direction < 112.5) cardinal = 'East';
    else if (direction >= 112.5 && direction < 157.5) cardinal = 'South-East';
    else if (direction >= 157.5 && direction < 202.5) cardinal = 'South';
    else if (direction >= 202.5 && direction < 247.5) cardinal = 'South-West';
    else if (direction >= 247.5 && direction < 292.5) cardinal = 'West';
    else if (direction >= 292.5 && direction < 337.5) cardinal = 'North-West';

    cardinalElement.textContent = cardinal;
  }

  /**
   * Draw the compass on canvas
   * @param {number} direction - Qibla direction in degrees (0-360)
   */
  drawCompass(direction) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw compass circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#f8f9fa';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw degree markers
    ctx.save();
    ctx.translate(centerX, centerY);

    for (let i = 0; i < 360; i += 30) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.lineTo(0, -radius + 10);
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Draw cardinal directions (N, S, E, W)
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // North
    ctx.fillText('N', 0, -radius + 25);
    // South
    ctx.fillText('S', 0, radius - 25);
    // East
    ctx.fillText('E', radius - 25, 0);
    // West
    ctx.fillText('W', -radius + 25, 0);

    // Draw intercardinal directions (NE, SE, SW, NW)
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#666';

    const offset = radius - 35;
    const diagOffset = offset * Math.cos(Math.PI / 4);

    ctx.fillText('NE', diagOffset, -diagOffset);
    ctx.fillText('SE', diagOffset, diagOffset);
    ctx.fillText('SW', -diagOffset, diagOffset);
    ctx.fillText('NW', -diagOffset, -diagOffset);

    // Draw center circle
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();

    // Draw Qibla direction arrow
    this.drawQiblaArrow(direction, radius);

    ctx.restore();

    // Draw direction text at bottom
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#28a745';
    ctx.textAlign = 'center';
    ctx.fillText(`${direction.toFixed(1)}°`, centerX, this.canvas.height - 10);
  }

  /**
   * Draw the Qibla direction arrow
   * @param {number} direction - Direction in degrees
   * @param {number} radius - Compass radius
   */
  drawQiblaArrow(direction, radius) {
    const ctx = this.ctx;

    ctx.save();
    ctx.rotate((direction * Math.PI) / 180);

    // Draw arrow shaft
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -radius + 40);
    ctx.strokeStyle = '#28a745';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(0, -radius + 40);
    ctx.lineTo(-10, -radius + 55);
    ctx.lineTo(10, -radius + 55);
    ctx.closePath();
    ctx.fillStyle = '#28a745';
    ctx.fill();

    // Draw arrow tail (opposite direction)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 30);
    ctx.strokeStyle = '#dc3545';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Animate compass needle from current direction to new direction
   * @param {number} targetDirection - Target direction in degrees
   */
  animateCompassNeedle(targetDirection) {
    // Cancel any ongoing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const startDirection = this.currentDirection;
    const startTime = performance.now();
    const duration = 1000; // 1 second animation

    // Calculate shortest rotation path
    let diff = targetDirection - startDirection;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-in-out)
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Calculate current direction
      let currentDirection = startDirection + (diff * easeProgress);

      // Normalize to 0-360
      currentDirection = ((currentDirection % 360) + 360) % 360;

      // Draw compass with current direction
      this.drawCompass(currentDirection);

      // Continue animation if not complete
      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.currentDirection = targetDirection;
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Show loading state
   * @param {boolean} isLoading - Whether to show loading state
   */
  showLoading(isLoading) {
    const calculateBtn = document.getElementById('calculateQiblaBtn');
    const locationBtn = document.getElementById('useLocationBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (calculateBtn) {
      calculateBtn.disabled = isLoading;
      calculateBtn.textContent = isLoading ? 'Calculating...' : 'Calculate Qibla';
    }

    if (locationBtn) {
      locationBtn.disabled = isLoading;
    }

    if (loadingIndicator) {
      loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
    console.error('Qibla Error:', message);
  }

  /**
   * Clear error message
   */
  clearError() {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  /**
   * Reset the module to initial state
   */
  reset() {
    // Stop tracking if active
    if (this.isTracking) {
      this.stopLiveTracking();
    }

    // Clear inputs
    const latInput = document.getElementById('latitudeInput');
    const lngInput = document.getElementById('longitudeInput');

    if (latInput) latInput.value = '';
    if (lngInput) lngInput.value = '';

    // Hide results
    const resultsContainer = document.getElementById('qiblaResults');
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
    }

    // Clear error
    this.clearError();

    // Reset compass
    this.currentDirection = 0;
    this.drawCompass(0);
  }

  /**
   * Start continuous Qibla tracking using device GPS
   */
  startLiveTracking() {
    if (!navigator.geolocation) {
      this.showError('Geolocation is not supported by your browser');
      return;
    }

    if (this.watchId) {
      console.log('Live tracking already active');
      return;
    }

    this.isTracking = true;
    this.clearError();

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000  // Accept cached position up to 5 seconds old
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log('GPS Update:', { lat, lng, accuracy });

        // Update input fields
        const latInput = document.getElementById('latitudeInput');
        const lngInput = document.getElementById('longitudeInput');

        if (latInput) latInput.value = lat.toFixed(6);
        if (lngInput) lngInput.value = lng.toFixed(6);

        // Calculate and display Qibla (calls existing API endpoint)
        this.calculateQibla(lat, lng);

        // Show accuracy indicator
        this.showAccuracy(accuracy);
      },
      (error) => {
        console.error('GPS tracking error:', error);

        let errorMessage = 'GPS tracking error';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            this.stopLiveTracking();
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        this.showError(errorMessage);
      },
      options
    );

    // Update UI to show tracking is active
    this.updateTrackingUI(true);
    console.log('Live Qibla tracking started');
  }

  /**
   * Stop continuous Qibla tracking
   */
  stopLiveTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
      this.updateTrackingUI(false);

      // Clear accuracy display
      const accuracyElement = document.getElementById('gpsAccuracy');
      if (accuracyElement) {
        accuracyElement.textContent = '--';
        accuracyElement.style.color = '';
      }

      console.log('Live Qibla tracking stopped');
    }
  }

  /**
   * Update UI to reflect tracking state
   * @param {boolean} isTracking - Whether tracking is active
   */
  updateTrackingUI(isTracking) {
    const startBtn = document.getElementById('startTrackingBtn');
    const stopBtn = document.getElementById('stopTrackingBtn');
    const trackingIndicator = document.getElementById('trackingIndicator');

    if (startBtn && stopBtn) {
      if (isTracking) {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
      } else {
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
      }
    }

    if (trackingIndicator) {
      trackingIndicator.style.display = isTracking ? 'inline-block' : 'none';
    }
  }

  /**
   * Show GPS accuracy indicator
   * @param {number} accuracy - GPS accuracy in meters
   */
  showAccuracy(accuracy) {
    const accuracyElement = document.getElementById('gpsAccuracy');
    if (accuracyElement) {
      accuracyElement.textContent = `±${accuracy.toFixed(0)}m`;

      // Color code by accuracy
      if (accuracy < 20) {
        accuracyElement.style.color = '#28a745'; // Green - excellent
      } else if (accuracy < 50) {
        accuracyElement.style.color = '#ffc107'; // Yellow - good
      } else {
        accuracyElement.style.color = '#dc3545'; // Red - poor
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QiblaTester;
}
