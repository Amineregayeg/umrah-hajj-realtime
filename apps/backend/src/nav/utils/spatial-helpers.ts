/**
 * Spatial helper functions for HMM-based map-matching
 * Provides optimized geographic calculations and spatial indexing utilities
 */

/**
 * Constants for geographic calculations
 */
export const EARTH_RADIUS = 6371e3; // meters
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Point interface for coordinates
 */
export interface Point {
  lat: number;
  lon: number;
}

/**
 * Bounding box interface
 */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Calculate Haversine distance between two points in meters
 * Optimized for indoor tracking scenarios
 */
export function haversineDistance(p1: Point, p2: Point): number {
  const φ1 = p1.lat * DEG_TO_RAD;
  const φ2 = p2.lat * DEG_TO_RAD;
  const Δφ = (p2.lat - p1.lat) * DEG_TO_RAD;
  const Δλ = (p2.lon - p1.lon) * DEG_TO_RAD;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS * c;
}

/**
 * Fast distance approximation for short distances (< 1km)
 * Uses equirectangular approximation - much faster than Haversine
 */
export function fastDistance(p1: Point, p2: Point): number {
  const x = (p2.lon - p1.lon) * Math.cos((p1.lat + p2.lat) * DEG_TO_RAD / 2);
  const y = p2.lat - p1.lat;
  return Math.sqrt(x * x + y * y) * EARTH_RADIUS * DEG_TO_RAD;
}

/**
 * Calculate bearing between two points in degrees
 */
export function calculateBearing(p1: Point, p2: Point): number {
  const φ1 = p1.lat * DEG_TO_RAD;
  const φ2 = p2.lat * DEG_TO_RAD;
  const Δλ = (p2.lon - p1.lon) * DEG_TO_RAD;
  
  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  const bearing = Math.atan2(x, y) * RAD_TO_DEG;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Project point onto line segment
 * Returns projected point and distance to original point
 */
export function projectPointToLineSegment(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): {
  point: Point;
  distance: number;
  t: number; // Parameter along line (0-1)
} {
  const dx = lineEnd.lon - lineStart.lon;
  const dy = lineEnd.lat - lineStart.lat;
  
  if (dx === 0 && dy === 0) {
    // Line segment is a point
    return {
      point: lineStart,
      distance: fastDistance(point, lineStart),
      t: 0
    };
  }
  
  // Calculate projection parameter t
  const t = Math.max(0, Math.min(1,
    ((point.lon - lineStart.lon) * dx + (point.lat - lineStart.lat) * dy) /
    (dx * dx + dy * dy)
  ));
  
  const projectedPoint = {
    lat: lineStart.lat + t * dy,
    lon: lineStart.lon + t * dx
  };
  
  return {
    point: projectedPoint,
    distance: fastDistance(point, projectedPoint),
    t
  };
}

/**
 * Check if point is inside polygon using ray casting
 */
export function isPointInPolygon(point: Point, polygon: Array<[number, number]>): boolean {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    
    const intersect = ((yi > point.lat) !== (yj > point.lat))
      && (point.lon < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Find nearest point on polygon boundary
 */
export function nearestPointOnPolygon(point: Point, polygon: Array<[number, number]>): Point {
  let nearestPoint = { lat: polygon[0][0], lon: polygon[0][1] };
  let minDistance = Infinity;
  
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const projection = projectPointToLineSegment(
      point,
      { lat: polygon[i][0], lon: polygon[i][1] },
      { lat: polygon[j][0], lon: polygon[j][1] }
    );
    
    if (projection.distance < minDistance) {
      minDistance = projection.distance;
      nearestPoint = projection.point;
    }
  }
  
  return nearestPoint;
}

/**
 * Create bounding box around point with given radius in meters
 */
export function createBoundingBox(center: Point, radiusMeters: number): BoundingBox {
  // Convert radius to degrees (approximate)
  const latDelta = radiusMeters / EARTH_RADIUS * RAD_TO_DEG;
  const lonDelta = radiusMeters / (EARTH_RADIUS * Math.cos(center.lat * DEG_TO_RAD)) * RAD_TO_DEG;
  
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLon: center.lon - lonDelta,
    maxLon: center.lon + lonDelta
  };
}

/**
 * Check if point is inside bounding box
 */
export function isPointInBoundingBox(point: Point, bbox: BoundingBox): boolean {
  return point.lat >= bbox.minLat && point.lat <= bbox.maxLat &&
         point.lon >= bbox.minLon && point.lon <= bbox.maxLon;
}

/**
 * Angular difference between two headings in degrees
 * Returns value between 0 and 180 degrees
 */
export function angularDistance(heading1: number, heading2: number): number {
  const diff = Math.abs(heading1 - heading2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Circular mean of angles in degrees
 */
export function circularMean(angles: number[]): number {
  if (angles.length === 0) return 0;
  
  let sinSum = 0;
  let cosSum = 0;
  
  for (const angle of angles) {
    const rad = angle * DEG_TO_RAD;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  
  return Math.atan2(sinSum, cosSum) * RAD_TO_DEG;
}

/**
 * Convert meters to latitude degrees
 */
export function metersToLatDegrees(meters: number): number {
  return meters / EARTH_RADIUS * RAD_TO_DEG;
}

/**
 * Convert meters to longitude degrees at given latitude
 */
export function metersToLonDegrees(meters: number, latitude: number): number {
  return meters / (EARTH_RADIUS * Math.cos(latitude * DEG_TO_RAD)) * RAD_TO_DEG;
}

/**
 * Convert latitude degrees to meters
 */
export function latDegreesToMeters(degrees: number): number {
  return degrees * EARTH_RADIUS * DEG_TO_RAD;
}

/**
 * Convert longitude degrees to meters at given latitude
 */
export function lonDegreesToMeters(degrees: number, latitude: number): number {
  return degrees * EARTH_RADIUS * Math.cos(latitude * DEG_TO_RAD) * DEG_TO_RAD;
}

/**
 * Simple spatial grid for efficient nearest neighbor queries
 * Useful for indexing nodes and edges
 */
export class SpatialGrid<T> {
  private grid: Map<string, T[]> = new Map();
  private cellSize: number;
  
  constructor(cellSizeMeters: number = 50) {
    // Convert to degrees (approximate)
    this.cellSize = cellSizeMeters / EARTH_RADIUS * RAD_TO_DEG;
  }
  
  /**
   * Add item to grid at given location
   */
  add(point: Point, item: T): void {
    const key = this.getGridKey(point);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(item);
  }
  
  /**
   * Query items within radius of point
   */
  query(center: Point, radiusMeters: number): T[] {
    const radiusDegrees = radiusMeters / EARTH_RADIUS * RAD_TO_DEG;
    const cellRadius = Math.ceil(radiusDegrees / this.cellSize);
    const centerKey = this.parseGridKey(this.getGridKey(center));
    
    const results: T[] = [];
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = this.formatGridKey(centerKey.x + dx, centerKey.y + dy);
        const items = this.grid.get(key);
        if (items) {
          results.push(...items);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Clear all items from grid
   */
  clear(): void {
    this.grid.clear();
  }
  
  private getGridKey(point: Point): string {
    const x = Math.floor(point.lon / this.cellSize);
    const y = Math.floor(point.lat / this.cellSize);
    return this.formatGridKey(x, y);
  }
  
  private formatGridKey(x: number, y: number): string {
    return `${x},${y}`;
  }
  
  private parseGridKey(key: string): { x: number; y: number } {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }
}

/**
 * Gaussian probability density function
 */
export function gaussianPDF(x: number, mean: number, stdDev: number): number {
  const variance = stdDev * stdDev;
  const exponent = -Math.pow(x - mean, 2) / (2 * variance);
  return Math.exp(exponent) / (stdDev * Math.sqrt(2 * Math.PI));
}

/**
 * von Mises probability density function for circular data
 * Used for heading probability calculations
 */
export function vonMisesPDF(x: number, mean: number, concentration: number): number {
  const xRad = x * DEG_TO_RAD;
  const meanRad = mean * DEG_TO_RAD;
  
  const exponent = concentration * Math.cos(xRad - meanRad);
  return Math.exp(exponent) / (2 * Math.PI * besselI0(concentration));
}

/**
 * Modified Bessel function of the first kind of order 0
 * Approximation for von Mises distribution
 */
function besselI0(x: number): number {
  if (x < 3.75) {
    const y = Math.pow(x / 3.75, 2);
    return 1.0 + y * (3.5156229 + y * (3.0899424 + y * (1.2067492 +
      y * (0.2659732 + y * (0.0360768 + y * 0.0045813)))));
  } else {
    const y = 3.75 / x;
    const exp = Math.exp(x) / Math.sqrt(x);
    return exp * (0.39894228 + y * (0.01328592 + y * (0.00225319 +
      y * (-0.00157565 + y * (0.00916281 + y * (-0.02057706 +
      y * (0.02635537 + y * (-0.01647633 + y * 0.00392377))))))));
  }
}

/**
 * Find index of maximum value in array
 */
export function argmax(arr: number[]): number {
  let maxIdx = 0;
  let maxVal = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > maxVal) {
      maxVal = arr[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}

/**
 * Calculate speed from position history
 */
export function calculateSpeed(
  positions: Array<{ lat: number; lon: number; ts: number }>,
  timeWindow: number = 3000 // 3 seconds
): number {
  if (positions.length < 2) return 0;
  
  const now = positions[positions.length - 1].ts;
  const validPositions = positions.filter(p => now - p.ts <= timeWindow);
  
  if (validPositions.length < 2) return 0;
  
  let totalDistance = 0;
  let totalTime = 0;
  
  for (let i = 1; i < validPositions.length; i++) {
    const dist = fastDistance(validPositions[i-1], validPositions[i]);
    const time = (validPositions[i].ts - validPositions[i-1].ts) / 1000; // seconds
    
    if (time > 0) {
      totalDistance += dist;
      totalTime += time;
    }
  }
  
  return totalTime > 0 ? totalDistance / totalTime : 0;
}