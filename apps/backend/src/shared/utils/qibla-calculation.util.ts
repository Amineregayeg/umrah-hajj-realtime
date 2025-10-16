/**
 * Real great-circle Qibla calculation utility
 * 
 * Uses exact mathematical formulas to calculate the bearing from any location
 * on Earth to the Kaaba in Mecca using the great-circle distance method.
 */

// Kaaba coordinates (exact location)
const KAABA_LATITUDE = 21.4225;
const KAABA_LONGITUDE = 39.8262;

/**
 * Convert degrees to radians
 * @param degrees - angle in degrees
 * @returns angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param radians - angle in radians
 * @returns angle in degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Normalize bearing to 0-360 degrees range
 * @param bearing - bearing in degrees
 * @returns normalized bearing (0-360)
 */
function normalizeBearing(bearing: number): number {
  return ((bearing % 360) + 360) % 360;
}

/**
 * Calculate the Qibla bearing from a given location to the Kaaba using great-circle calculation
 * 
 * This uses the exact mathematical formula for calculating bearing between two points
 * on a sphere using the great-circle distance method.
 * 
 * Formula:
 * θ = atan2(sin(Δlong).cos(lat2), cos(lat1).sin(lat2) − sin(lat1).cos(lat2).cos(Δlong))
 * 
 * Where:
 * - lat1, long1: starting point coordinates (user location)
 * - lat2, long2: ending point coordinates (Kaaba)
 * - Δlong: difference in longitude
 * - θ: bearing from North in degrees
 * 
 * @param userLatitude - User's latitude in degrees
 * @param userLongitude - User's longitude in degrees
 * @returns Qibla bearing in degrees (0-360, where 0/360 is North, 90 is East, 180 is South, 270 is West)
 */
export function qiblaBearingDeg(userLatitude: number, userLongitude: number): number {
  // Validate input coordinates
  if (Math.abs(userLatitude) > 90) {
    throw new Error('Invalid latitude: must be between -90 and 90 degrees');
  }
  if (Math.abs(userLongitude) > 180) {
    throw new Error('Invalid longitude: must be between -180 and 180 degrees');
  }

  // Convert coordinates to radians
  const lat1 = toRadians(userLatitude);
  const lon1 = toRadians(userLongitude);
  const lat2 = toRadians(KAABA_LATITUDE);
  const lon2 = toRadians(KAABA_LONGITUDE);

  // Calculate longitude difference
  const deltaLon = lon2 - lon1;

  // Apply the great-circle bearing formula
  // θ = atan2(sin(Δlong).cos(lat2), cos(lat1).sin(lat2) − sin(lat1).cos(lat2).cos(Δlong))
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  // Calculate initial bearing in radians
  const bearingRad = Math.atan2(y, x);
  
  // Convert to degrees and normalize to 0-360 range
  const bearingDeg = toDegrees(bearingRad);
  
  return normalizeBearing(bearingDeg);
}

/**
 * Calculate the great-circle distance between user location and Kaaba
 * @param userLatitude - User's latitude in degrees
 * @param userLongitude - User's longitude in degrees
 * @returns Distance in kilometers
 */
export function distanceToKaabaKm(userLatitude: number, userLongitude: number): number {
  const R = 6371; // Earth's radius in kilometers

  const lat1 = toRadians(userLatitude);
  const lon1 = toRadians(userLongitude);
  const lat2 = toRadians(KAABA_LATITUDE);
  const lon2 = toRadians(KAABA_LONGITUDE);

  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;

  // Haversine formula
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Get Kaaba coordinates
 * @returns Kaaba location
 */
export function getKaabaCoordinates() {
  return {
    latitude: KAABA_LATITUDE,
    longitude: KAABA_LONGITUDE,
  };
}