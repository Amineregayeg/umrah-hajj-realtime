import { Injectable, Logger } from '@nestjs/common';
import { NavUpdateDto } from '../dto/nav-update.dto';
import { NavCorrectionDto } from '../dto/nav-correction.dto';
import { GraphService } from '../graph/services/graph.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { PathfindingService } from '../graph/algorithms/pathfinding.service';
import { HMMTrackingService } from './hmm-tracking.service';
import { NavGraph, Node, Edge, Zone, Connector } from '../graph/interfaces/graph.interface';
import { MetricsService } from '../../metrics/metrics.service';

interface MapMatchResult {
  snapTo: 'path' | 'zone' | 'node';
  snappedPosition: { lat: number; lon: number; floor: string };
  delta: { x: number; y: number };
  confidence: number;
  segmentId?: string;
  zoneId?: string;
  nodeId?: string;
  projectionError: number;
}

interface RouteState {
  userId: string;
  currentPath?: string[];
  currentSegmentIndex?: number;
  targetWaypoint?: string; // Current navigation target
  lastOnPathTime?: number;
  lastValidFloor?: string;
  headingHistory: number[];
  positionHistory: Array<{ lat: number; lon: number; ts: number }>;
  offPathDuration: number;
  headingDeflectionDuration: number;
  smoothedPosition?: { lat: number; lon: number };
  hmmResetCount: number;
  teleportDetectedCount: number;
  lastSnapError?: number;
  lastRerouteReason?: 'off_path' | 'heading_deflection' | 'teleport' | 'manual';
  lastRerouteTimestamp?: number;
}

@Injectable()
export class NavigationCorrectionService {
  private readonly logger = new Logger(NavigationCorrectionService.name);
  private userRouteStates = new Map<string, RouteState>();
  
  // Constants for map-matching and re-routing
  private readonly MAX_SNAP_DISTANCE = 10; // meters
  private readonly OFF_PATH_DISTANCE_THRESHOLD = 6; // meters
  private readonly OFF_PATH_TIME_THRESHOLD = 4000; // 4 seconds
  private readonly HEADING_DEFLECTION_THRESHOLD = 45; // degrees
  private readonly HEADING_DEFLECTION_TIME_THRESHOLD = 2000; // 2 seconds
  private readonly POSITION_SMOOTHING_ALPHA = 0.3; // exponential smoothing factor
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly EARTH_RADIUS = 6371e3; // meters

  constructor(
    private readonly graphService: GraphService,
    private readonly graphLoader: GraphLoaderService,
    private readonly pathfindingService: PathfindingService,
    private readonly hmmTrackingService: HMMTrackingService,
    private readonly metricsService: MetricsService
  ) {}

  /**
   * Process navigation update and generate corrections
   * Uses HMM-based map-matching as primary algorithm with re-routing support
   */
  async processNavigationUpdate(update: NavUpdateDto): Promise<MapMatchResult | null> {
    const startTime = Date.now();
    
    try {
      // Get or create user route state
      const routeState = this.getUserRouteState(update.userId);
      
      // Update position and heading history
      this.updateHistory(routeState, update);
      
      // Use HMM tracking service as primary map-matching algorithm
      const hmmResult = await this.hmmTrackingService.processNavigationUpdate(update);
      
      if (!hmmResult) {
        // Fallback to original method if HMM fails
        this.logger.debug(`HMM tracking failed for user ${update.userId}, falling back to legacy method`);
        return this.performLegacyMapMatching(update, routeState);
      }

      // Convert HMM result to our MapMatchResult format with backward compatibility
      const matchResult: MapMatchResult = {
        snapTo: hmmResult.snapTo === 'path' ? 'path' : hmmResult.snapTo === 'node' ? 'node' : 'zone',
        snappedPosition: hmmResult.position,
        delta: hmmResult.delta,
        confidence: hmmResult.confidence,
        segmentId: hmmResult.edgeId,
        nodeId: hmmResult.nodeId,
        projectionError: Math.sqrt(hmmResult.delta.x * hmmResult.delta.x + hmmResult.delta.y * hmmResult.delta.y) / 20 // Normalize to 0-1 scale
      };

      // Track snap error for metrics
      const snapError = Math.sqrt(hmmResult.delta.x * hmmResult.delta.x + hmmResult.delta.y * hmmResult.delta.y);
      routeState.lastSnapError = snapError;
      this.metricsService.observeSnapError(update.userId, snapError);

      // Check for teleport detection (delegated to HMM service)
      const hmmStats = this.hmmTrackingService.getStats();
      if (hmmStats.teleportEvents > routeState.teleportDetectedCount) {
        routeState.teleportDetectedCount = hmmStats.teleportEvents;
        routeState.lastRerouteReason = 'teleport';
        routeState.lastRerouteTimestamp = Date.now();
        this.metricsService.incrementTeleportDetected(update.userId);
        this.logger.log(`Teleport detected for user ${update.userId}, may trigger reroute`);
        
        // Force reroute on teleport if user has active route
        if (routeState.currentPath && routeState.targetWaypoint) {
          await this.performReroute(routeState, matchResult, update);
        }
      }

      // Check if re-routing is needed
      const needsReroute = this.checkReRouteConditions(routeState, matchResult, update);
      if (needsReroute) {
        await this.performReroute(routeState, matchResult, update);
      }
      
      const processingTime = Date.now() - startTime;
      if (processingTime > 10) {
        this.logger.debug(`HMM navigation correction took ${processingTime}ms`);
      }
      
      return matchResult;
    } catch (error) {
      this.logger.error(`Error processing navigation update: ${error.message}`);
      return null;
    }
  }

  /**
   * Legacy map matching method (fallback when HMM fails)
   */
  private async performLegacyMapMatching(update: NavUpdateDto, routeState: RouteState): Promise<MapMatchResult | null> {
    // Apply exponential smoothing to position
    const smoothedPosition = this.applySmoothingToPosition(routeState, update.pos);
    routeState.smoothedPosition = smoothedPosition;
    
    // Get graph data
    const graph = this.graphLoader.getGraph();
    
    // Perform legacy map matching
    const matchResult = this.performMapMatching(
      smoothedPosition,
      update.pos.floor,
      update.heading,
      routeState,
      graph
    );
    
    if (!matchResult) {
      return null;
    }
    
    // Check floor transitions
    const floorTransitionValid = this.validateFloorTransition(
      routeState.lastValidFloor,
      matchResult.snappedPosition.floor,
      update.confidence,
      graph
    );
    
    if (!floorTransitionValid && update.confidence >= this.CONFIDENCE_THRESHOLD) {
      this.logger.warn(
        `Invalid floor transition for user ${update.userId}: ` +
        `${routeState.lastValidFloor} -> ${matchResult.snappedPosition.floor}`
      );
      return null;
    }
    
    // Update last valid floor
    if (floorTransitionValid) {
      routeState.lastValidFloor = matchResult.snappedPosition.floor;
    }
    
    return matchResult;
  }

  /**
   * Perform map matching to snap position to nearest path/zone
   */
  private performMapMatching(
    position: { lat: number; lon: number },
    floor: number,
    heading: number,
    routeState: RouteState,
    graph: NavGraph
  ): MapMatchResult | null {
    // Map floor number to floor ID based on common conventions
    const floorId = this.getFloorId(floor);
    
    // Find nearest edge (path segment)
    const nearestEdge = this.findNearestEdge(position, floorId, graph);
    
    // Find nearest zone
    const nearestZone = this.findNearestZone(position, floorId, graph);
    
    // Find nearest node
    const nearestNode = this.findNearestNode(position, floorId, graph);
    
    // Determine best match based on distance and confidence
    let bestMatch: MapMatchResult | null = null;
    
    if (nearestEdge && nearestEdge.distance <= this.MAX_SNAP_DISTANCE) {
      const confidence = this.calculateConfidence(nearestEdge.distance, nearestEdge.projectionError, heading);
      bestMatch = {
        snapTo: 'path',
        snappedPosition: { ...nearestEdge.projectedPoint, floor: floorId },
        delta: {
          x: (nearestEdge.projectedPoint.lon - position.lon) * this.lonToMeters(position.lat),
          y: (nearestEdge.projectedPoint.lat - position.lat) * this.latToMeters()
        },
        confidence,
        segmentId: nearestEdge.edgeId,
        projectionError: nearestEdge.projectionError
      };
    }
    
    if (nearestZone && nearestZone.distance < (bestMatch ? nearestEdge!.distance : this.MAX_SNAP_DISTANCE)) {
      const confidence = this.calculateZoneConfidence(nearestZone.distance, nearestZone.isInside);
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          snapTo: 'zone',
          snappedPosition: { ...nearestZone.nearestPoint, floor: floorId },
          delta: {
            x: (nearestZone.nearestPoint.lon - position.lon) * this.lonToMeters(position.lat),
            y: (nearestZone.nearestPoint.lat - position.lat) * this.latToMeters()
          },
          confidence,
          zoneId: nearestZone.zoneId,
          projectionError: nearestZone.distance
        };
      }
    }
    
    if (nearestNode && nearestNode.distance < 2.0) { // Snap to node if very close
      const confidence = 1.0 - (nearestNode.distance / 2.0);
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          snapTo: 'node',
          snappedPosition: { lat: nearestNode.node.lat, lon: nearestNode.node.lon, floor: floorId },
          delta: {
            x: (nearestNode.node.lon - position.lon) * this.lonToMeters(position.lat),
            y: (nearestNode.node.lat - position.lat) * this.latToMeters()
          },
          confidence,
          nodeId: nearestNode.node.id,
          projectionError: 0
        };
      }
    }
    
    return bestMatch;
  }

  /**
   * Find nearest edge using point-to-line-segment distance
   */
  private findNearestEdge(
    position: { lat: number; lon: number },
    floorId: string,
    graph: NavGraph
  ): { edgeId: string; distance: number; projectedPoint: { lat: number; lon: number }; projectionError: number } | null {
    let nearestEdge: any = null;
    let minDistance = Infinity;
    
    for (const edge of graph.edges) {
      const fromNode = graph.nodes.find(n => n.id === edge.from);
      const toNode = graph.nodes.find(n => n.id === edge.to);
      
      if (!fromNode || !toNode || fromNode.floor !== floorId || toNode.floor !== floorId) {
        continue;
      }
      
      const projection = this.projectPointToLineSegment(
        position,
        { lat: fromNode.lat, lon: fromNode.lon },
        { lat: toNode.lat, lon: toNode.lon }
      );
      
      if (projection.distance < minDistance) {
        minDistance = projection.distance;
        nearestEdge = {
          edgeId: `${edge.from}-${edge.to}`,
          distance: projection.distance,
          projectedPoint: projection.point,
          projectionError: projection.projectionError
        };
      }
    }
    
    return nearestEdge;
  }

  /**
   * Find nearest zone using point-in-polygon and distance to polygon edge
   */
  private findNearestZone(
    position: { lat: number; lon: number },
    floorId: string,
    graph: NavGraph
  ): { zoneId: string; distance: number; nearestPoint: { lat: number; lon: number }; isInside: boolean } | null {
    let nearestZone: any = null;
    let minDistance = Infinity;
    
    for (const zone of graph.zones) {
      if (zone.floor !== floorId) {
        continue;
      }
      
      const isInside = this.isPointInPolygon(position, zone.polygon);
      const nearestPoint = this.nearestPointOnPolygon(position, zone.polygon);
      const distance = this.haversineDistance(position, nearestPoint);
      
      if (isInside || distance < minDistance) {
        minDistance = distance;
        nearestZone = {
          zoneId: zone.id,
          distance: isInside ? 0 : distance,
          nearestPoint,
          isInside
        };
      }
    }
    
    return nearestZone;
  }

  /**
   * Find nearest node
   */
  private findNearestNode(
    position: { lat: number; lon: number },
    floorId: string,
    graph: NavGraph
  ): { node: Node; distance: number } | null {
    let nearestNode: Node | null = null;
    let minDistance = Infinity;
    
    for (const node of graph.nodes) {
      if (node.floor !== floorId) {
        continue;
      }
      
      const distance = this.haversineDistance(position, { lat: node.lat, lon: node.lon });
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }
    
    return nearestNode ? { node: nearestNode, distance: minDistance } : null;
  }

  /**
   * Project point to line segment
   */
  private projectPointToLineSegment(
    point: { lat: number; lon: number },
    lineStart: { lat: number; lon: number },
    lineEnd: { lat: number; lon: number }
  ): { point: { lat: number; lon: number }; distance: number; projectionError: number } {
    const dx = lineEnd.lon - lineStart.lon;
    const dy = lineEnd.lat - lineStart.lat;
    
    if (dx === 0 && dy === 0) {
      // Line segment is a point
      return {
        point: lineStart,
        distance: this.haversineDistance(point, lineStart),
        projectionError: 0
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
    
    const distance = this.haversineDistance(point, projectedPoint);
    const projectionError = Math.min(
      this.haversineDistance(projectedPoint, lineStart),
      this.haversineDistance(projectedPoint, lineEnd)
    ) / this.haversineDistance(lineStart, lineEnd);
    
    return { point: projectedPoint, distance, projectionError };
  }

  /**
   * Check if point is inside polygon
   */
  private isPointInPolygon(
    point: { lat: number; lon: number },
    polygon: Array<[number, number]>
  ): boolean {
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
  private nearestPointOnPolygon(
    point: { lat: number; lon: number },
    polygon: Array<[number, number]>
  ): { lat: number; lon: number } {
    let nearestPoint = { lat: polygon[0][0], lon: polygon[0][1] };
    let minDistance = Infinity;
    
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const projection = this.projectPointToLineSegment(
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
   * Calculate confidence score based on distance and projection error
   */
  private calculateConfidence(distance: number, projectionError: number, heading: number): number {
    const distanceConfidence = Math.exp(-distance / 3.0); // Exponential decay
    const projectionConfidence = 1.0 - projectionError;
    
    return distanceConfidence * projectionConfidence * 0.9; // Max 0.9 for path matching
  }

  /**
   * Calculate zone confidence
   */
  private calculateZoneConfidence(distance: number, isInside: boolean): number {
    if (isInside) {
      return 0.95; // High confidence if inside zone
    }
    return Math.exp(-distance / 5.0) * 0.7; // Lower confidence if outside
  }

  /**
   * Validate floor transition
   */
  private validateFloorTransition(
    fromFloor: string | undefined,
    toFloor: string,
    confidence: number,
    graph: NavGraph
  ): boolean {
    if (!fromFloor || fromFloor === toFloor) {
      return true; // Same floor or first update
    }
    
    // Allow transition if confidence is low (uncertain position)
    if (confidence < this.CONFIDENCE_THRESHOLD) {
      return true;
    }
    
    // Check if there's a valid connector between floors
    const hasConnector = graph.connectors.some(conn => {
      const fromNode = graph.nodes.find(n => n.id === conn.from);
      const toNode = graph.nodes.find(n => n.id === conn.to);
      
      return (
        (fromNode?.floor === fromFloor && toNode?.floor === toFloor) ||
        (fromNode?.floor === toFloor && toNode?.floor === fromFloor)
      );
    });
    
    return hasConnector;
  }

  /**
   * Check if re-routing is needed
   */
  private checkReRouteConditions(
    routeState: RouteState,
    matchResult: MapMatchResult,
    update: NavUpdateDto
  ): boolean {
    if (!routeState.currentPath || routeState.currentPath.length === 0 || !routeState.targetWaypoint) {
      return false; // No active route
    }
    
    const now = Date.now();
    
    // Check off-path distance
    if (matchResult.projectionError > this.OFF_PATH_DISTANCE_THRESHOLD / this.MAX_SNAP_DISTANCE) {
      routeState.offPathDuration += now - (routeState.lastOnPathTime || now);
      if (routeState.offPathDuration >= this.OFF_PATH_TIME_THRESHOLD) {
        routeState.lastRerouteReason = 'off_path';
        routeState.lastRerouteTimestamp = now;
        this.logger.debug(
          `Off-path condition met for user ${update.userId}: ` +
          `${routeState.offPathDuration}ms, distance: ${matchResult.projectionError * this.MAX_SNAP_DISTANCE}m`
        );
        return true;
      }
    } else {
      routeState.offPathDuration = 0;
      routeState.lastOnPathTime = now;
    }
    
    // Check heading deflection
    if (routeState.headingHistory.length >= 2) {
      const avgHeading = this.calculateAverageHeading(routeState.headingHistory);
      const expectedHeading = this.calculateExpectedHeading(routeState);
      const deflection = Math.abs(this.normalizeAngle(avgHeading - expectedHeading));
      
      if (deflection > this.HEADING_DEFLECTION_THRESHOLD) {
        routeState.headingDeflectionDuration += now - (routeState.positionHistory[routeState.positionHistory.length - 2]?.ts || now);
        if (routeState.headingDeflectionDuration >= this.HEADING_DEFLECTION_TIME_THRESHOLD) {
          routeState.lastRerouteReason = 'heading_deflection';
          routeState.lastRerouteTimestamp = now;
          this.logger.debug(
            `Heading deflection condition met for user ${update.userId}: ` +
            `${routeState.headingDeflectionDuration}ms, deflection: ${deflection}°`
          );
          return true;
        }
      } else {
        routeState.headingDeflectionDuration = 0;
      }
    }
    
    return false;
  }

  /**
   * Perform re-routing using shortest path algorithm (A* or Dijkstra)
   */
  private async performReroute(
    routeState: RouteState,
    matchResult: MapMatchResult,
    update: NavUpdateDto
  ): Promise<void> {
    try {
      if (!routeState.targetWaypoint) {
        this.logger.warn(`No target waypoint for re-route of user ${routeState.userId}`);
        return;
      }

      // Find nearest node to current position for starting point
      const graph = this.graphLoader.getGraph();
      const currentNode = this.findNearestNode(
        matchResult.snappedPosition,
        matchResult.snappedPosition.floor,
        graph
      );

      if (!currentNode) {
        this.logger.warn(`Cannot find nearest node for re-route of user ${routeState.userId}`);
        return;
      }

      // Calculate shortest path to target waypoint using A* algorithm
      const pathResult = await this.pathfindingService.findPath({
        from: currentNode.node.id,
        to: routeState.targetWaypoint,
        algorithm: 'astar', // Use A* for optimal performance
        avoidFloorChanges: false
      });

      // Update route state with new path
      routeState.currentPath = pathResult.path;
      routeState.currentSegmentIndex = 0;
      routeState.offPathDuration = 0;
      routeState.headingDeflectionDuration = 0;
      
      // Reset HMM target edge set and increment counter
      this.hmmTrackingService.clearUserState(routeState.userId);
      routeState.hmmResetCount++;
      this.metricsService.incrementHmmResets(routeState.userId);
      this.metricsService.incrementReroutes(routeState.userId);
      
      this.logger.log(
        `Re-route completed for user ${routeState.userId}: ` +
        `${pathResult.path.length} nodes, distance: ${pathResult.distance.toFixed(1)}m, ` +
        `reason: ${this.getLastRerouteReason(routeState)}`
      );
    } catch (error) {
      this.logger.error(`Re-route failed for user ${routeState.userId}: ${error.message}`);
    }
  }

  /**
   * Apply exponential smoothing to position
   */
  private applySmoothingToPosition(
    routeState: RouteState,
    newPosition: { lat: number; lon: number }
  ): { lat: number; lon: number } {
    if (!routeState.smoothedPosition) {
      return newPosition;
    }
    
    return {
      lat: this.POSITION_SMOOTHING_ALPHA * newPosition.lat + 
           (1 - this.POSITION_SMOOTHING_ALPHA) * routeState.smoothedPosition.lat,
      lon: this.POSITION_SMOOTHING_ALPHA * newPosition.lon + 
           (1 - this.POSITION_SMOOTHING_ALPHA) * routeState.smoothedPosition.lon
    };
  }

  /**
   * Update position and heading history
   */
  private updateHistory(routeState: RouteState, update: NavUpdateDto): void {
    // Keep last 10 positions
    routeState.positionHistory.push({
      lat: update.pos.lat,
      lon: update.pos.lon,
      ts: update.ts
    });
    if (routeState.positionHistory.length > 10) {
      routeState.positionHistory.shift();
    }
    
    // Keep last 5 headings
    routeState.headingHistory.push(update.heading);
    if (routeState.headingHistory.length > 5) {
      routeState.headingHistory.shift();
    }
  }

  /**
   * Calculate average heading from history
   */
  private calculateAverageHeading(headings: number[]): number {
    // Use circular mean for heading calculation
    let sinSum = 0;
    let cosSum = 0;
    
    for (const heading of headings) {
      const rad = heading * Math.PI / 180;
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
    }
    
    return Math.atan2(sinSum, cosSum) * 180 / Math.PI;
  }

  /**
   * Calculate expected heading based on route
   */
  private calculateExpectedHeading(routeState: RouteState): number {
    if (!routeState.currentPath || routeState.currentSegmentIndex === undefined ||
        routeState.currentSegmentIndex >= routeState.currentPath.length - 1) {
      return 0;
    }
    
    const graph = this.graphLoader.getGraph();
    const fromNode = graph.nodes.find(n => n.id === routeState.currentPath![routeState.currentSegmentIndex!]);
    const toNode = graph.nodes.find(n => n.id === routeState.currentPath![routeState.currentSegmentIndex! + 1]);
    
    if (!fromNode || !toNode) {
      return 0;
    }
    
    const dx = toNode.lon - fromNode.lon;
    const dy = toNode.lat - fromNode.lat;
    
    return Math.atan2(dx, dy) * 180 / Math.PI;
  }

  /**
   * Normalize angle to -180 to 180 range
   */
  private normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  /**
   * Calculate Haversine distance between two points
   */
  private haversineDistance(
    p1: { lat: number; lon: number },
    p2: { lat: number; lon: number }
  ): number {
    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;
    const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
    const Δλ = (p2.lon - p1.lon) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return this.EARTH_RADIUS * c;
  }

  /**
   * Convert longitude difference to meters
   */
  private lonToMeters(lat: number): number {
    return Math.cos(lat * Math.PI / 180) * 111320;
  }

  /**
   * Convert latitude difference to meters
   */
  private latToMeters(): number {
    return 110540;
  }

  /**
   * Get the last reroute reason with timestamp
   */
  private getLastRerouteReason(routeState: RouteState): string {
    if (!routeState.lastRerouteReason || !routeState.lastRerouteTimestamp) {
      return 'unknown';
    }
    
    const timeSinceReroute = Date.now() - routeState.lastRerouteTimestamp;
    return `${routeState.lastRerouteReason} (${Math.round(timeSinceReroute)}ms ago)`;
  }

  /**
   * Get or create user route state
   */
  private getUserRouteState(userId: string): RouteState {
    if (!this.userRouteStates.has(userId)) {
      this.userRouteStates.set(userId, {
        userId,
        headingHistory: [],
        positionHistory: [],
        offPathDuration: 0,
        headingDeflectionDuration: 0,
        hmmResetCount: 0,
        teleportDetectedCount: 0
      });
    }
    return this.userRouteStates.get(userId)!;
  }

  /**
   * Update user's active route
   */
  updateUserRoute(userId: string, path: string[], targetWaypoint?: string): void {
    const routeState = this.getUserRouteState(userId);
    routeState.currentPath = path;
    routeState.currentSegmentIndex = 0;
    routeState.targetWaypoint = targetWaypoint || path[path.length - 1]; // Default to last node
    routeState.offPathDuration = 0;
    routeState.headingDeflectionDuration = 0;
    
    this.logger.log(`Updated route for user ${userId}: ${path.length} nodes, target: ${routeState.targetWaypoint}`);
  }

  /**
   * Clear user route state
   */
  clearUserState(userId: string): void {
    // Also clear HMM tracking state
    this.hmmTrackingService.clearUserState(userId);
    this.userRouteStates.delete(userId);
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): {
    activeUsers: number;
    averageProcessingTime: number;
    totalCorrections: number;
    totalHmmResets: number;
    totalTeleportDetections: number;
    averageSnapError: number;
  } {
    let totalHmmResets = 0;
    let totalTeleportDetections = 0;
    let totalSnapError = 0;
    let snapErrorCount = 0;

    for (const state of this.userRouteStates.values()) {
      totalHmmResets += state.hmmResetCount;
      totalTeleportDetections += state.teleportDetectedCount;
      if (state.lastSnapError !== undefined) {
        totalSnapError += state.lastSnapError;
        snapErrorCount++;
      }
    }

    return {
      activeUsers: this.userRouteStates.size,
      averageProcessingTime: 0, // Would be tracked with performance monitoring
      totalCorrections: 0, // Would be tracked with WebSocket metrics
      totalHmmResets,
      totalTeleportDetections,
      averageSnapError: snapErrorCount > 0 ? totalSnapError / snapErrorCount : 0
    };
  }

  /**
   * Map floor number to floor ID
   */
  private getFloorId(floor: number): string {
    // Common floor mapping conventions
    const floorMap: Record<number, string> = {
      0: 'ground',
      1: 'first',
      2: 'second',
      3: 'third',
      [-1]: 'basement'
    };
    
    return floorMap[floor] || `floor_${floor}`;
  }
}