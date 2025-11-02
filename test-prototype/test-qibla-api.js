#!/usr/bin/env node

/**
 * Qibla API Integration Test Script
 *
 * This Node.js script tests the Qibla direction API endpoint
 * directly without using the browser interface.
 *
 * Usage: node test-qibla-api.js
 */

const https = require('https');

// Configuration
const API_BASE_URL = 'psychological-jilli-amineregayeg-1fe35444.koyeb.app';

// Test locations with expected approximate directions
const TEST_LOCATIONS = [
  {
    name: 'New York, USA',
    lat: 40.7128,
    lng: -74.0060,
    expectedDirection: 58,
    tolerance: 5
  },
  {
    name: 'London, UK',
    lat: 51.5074,
    lng: -0.1278,
    expectedDirection: 118,
    tolerance: 5
  },
  {
    name: 'Tokyo, Japan',
    lat: 35.6762,
    lng: 139.6503,
    expectedDirection: 293,
    tolerance: 5
  },
  {
    name: 'Sydney, Australia',
    lat: -33.8688,
    lng: 151.2093,
    expectedDirection: 277,
    tolerance: 5
  },
  {
    name: 'São Paulo, Brazil',
    lat: -23.5505,
    lng: -46.6333,
    expectedDirection: 72,
    tolerance: 5
  },
  {
    name: 'Dubai, UAE',
    lat: 25.2048,
    lng: 55.2708,
    expectedDirection: 259,
    tolerance: 5
  },
  {
    name: 'Kaaba (Mecca)',
    lat: 21.4225,
    lng: 39.8262,
    expectedDirection: null, // At Kaaba, direction is undefined
    tolerance: null
  }
];

/**
 * Make HTTPS GET request to Qibla API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} API response
 */
function callQiblaAPI(lat, lng) {
  return new Promise((resolve, reject) => {
    const path = `/content/qibla?lat=${lat}&lng=${lng}`;
    const options = {
      hostname: API_BASE_URL,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Validate API response structure
 * @param {Object} data - API response
 * @returns {Object} Validation result
 */
function validateResponse(data) {
  const errors = [];

  if (!data) {
    errors.push('Response is null or undefined');
    return { valid: false, errors };
  }

  // Check location object
  if (!data.location) {
    errors.push('Missing location object');
  } else {
    if (typeof data.location.latitude !== 'number') {
      errors.push('location.latitude is not a number');
    }
    if (typeof data.location.longitude !== 'number') {
      errors.push('location.longitude is not a number');
    }
  }

  // Check qibla object
  if (!data.qibla) {
    errors.push('Missing qibla object');
  } else {
    if (typeof data.qibla.direction !== 'number') {
      errors.push('qibla.direction is not a number');
    } else if (data.qibla.direction < 0 || data.qibla.direction >= 360) {
      errors.push(`qibla.direction (${data.qibla.direction}) is out of range [0, 360)`);
    }
    if (typeof data.qibla.distance !== 'number') {
      errors.push('qibla.distance is not a number');
    } else if (data.qibla.distance < 0) {
      errors.push(`qibla.distance (${data.qibla.distance}) is negative`);
    }
  }

  // Check kaaba object
  if (!data.kaaba) {
    errors.push('Missing kaaba object');
  } else {
    if (typeof data.kaaba.latitude !== 'number') {
      errors.push('kaaba.latitude is not a number');
    }
    if (typeof data.kaaba.longitude !== 'number') {
      errors.push('kaaba.longitude is not a number');
    }
  }

  // Check calculatedAt
  if (!data.calculatedAt) {
    errors.push('Missing calculatedAt field');
  } else {
    const date = new Date(data.calculatedAt);
    if (isNaN(date.getTime())) {
      errors.push('calculatedAt is not a valid ISO date');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get cardinal direction from degrees
 * @param {number} degrees - Direction in degrees
 * @returns {string} Cardinal direction
 */
function getCardinalDirection(degrees) {
  if (degrees >= 337.5 || degrees < 22.5) return 'N';
  if (degrees >= 22.5 && degrees < 67.5) return 'NE';
  if (degrees >= 67.5 && degrees < 112.5) return 'E';
  if (degrees >= 112.5 && degrees < 157.5) return 'SE';
  if (degrees >= 157.5 && degrees < 202.5) return 'S';
  if (degrees >= 202.5 && degrees < 247.5) return 'SW';
  if (degrees >= 247.5 && degrees < 292.5) return 'W';
  if (degrees >= 292.5 && degrees < 337.5) return 'NW';
  return '?';
}

/**
 * Test a single location
 * @param {Object} location - Test location object
 * @returns {Promise<Object>} Test result
 */
async function testLocation(location) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${location.name}`);
  console.log(`Coordinates: ${location.lat}, ${location.lng}`);
  console.log('-'.repeat(60));

  try {
    const startTime = Date.now();
    const response = await callQiblaAPI(location.lat, location.lng);
    const duration = Date.now() - startTime;

    // Validate response structure
    const validation = validateResponse(response);

    if (!validation.valid) {
      console.log('❌ FAILED - Invalid response structure:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
      return { success: false, location: location.name, error: 'Invalid response structure' };
    }

    // Display results
    console.log('✅ Response structure valid');
    console.log(`\nResults:`);
    console.log(`  Direction: ${response.qibla.direction.toFixed(2)}° (${getCardinalDirection(response.qibla.direction)})`);
    console.log(`  Distance: ${response.qibla.distance.toFixed(2)} km`);
    console.log(`  User Location: ${response.location.latitude.toFixed(6)}, ${response.location.longitude.toFixed(6)}`);
    console.log(`  Kaaba Location: ${response.kaaba.latitude.toFixed(6)}, ${response.kaaba.longitude.toFixed(6)}`);
    console.log(`  Calculated At: ${response.calculatedAt}`);
    console.log(`  Response Time: ${duration} ms`);

    // Check expected direction (if provided)
    if (location.expectedDirection !== null) {
      const directionDiff = Math.abs(response.qibla.direction - location.expectedDirection);
      const withinTolerance = directionDiff <= location.tolerance;

      if (withinTolerance) {
        console.log(`\n✅ Direction matches expected value (±${location.tolerance}°)`);
      } else {
        console.log(`\n⚠️  Direction differs from expected value by ${directionDiff.toFixed(2)}°`);
        console.log(`   Expected: ~${location.expectedDirection}°, Got: ${response.qibla.direction.toFixed(2)}°`);
      }
    } else {
      console.log(`\n✅ At Kaaba location (direction not checked)`);
    }

    return { success: true, location: location.name, response, duration };

  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    return { success: false, location: location.name, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Qibla API Integration Test Suite                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nAPI Base URL: https://${API_BASE_URL}`);
  console.log(`Test Locations: ${TEST_LOCATIONS.length}`);
  console.log(`Start Time: ${new Date().toISOString()}\n`);

  const results = [];

  // Test each location
  for (const location of TEST_LOCATIONS) {
    const result = await testLocation(location);
    results.push(result);

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (totalTime > 0) {
    console.log(`Average Response Time: ${(totalTime / passed).toFixed(0)} ms`);
  }

  // List failures
  if (failed > 0) {
    console.log(`\nFailed Tests:`);
    results.filter(r => !r.success).forEach(result => {
      console.log(`  ❌ ${result.location}: ${result.error}`);
    });
  }

  console.log(`\nEnd Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
