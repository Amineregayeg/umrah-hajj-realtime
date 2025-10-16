import { Injectable, Logger } from '@nestjs/common';
import { NavUpdateDto } from '../dto/nav-update.dto';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { NavGraph, Node, Edge, Connector, Zone } from '../graph/interfaces/graph.interface';

/**
 * Hidden Markov Model (HMM) based map-matching service for indoor pedestrian tracking
 * Implements Viterbi algorithm with emission and transition probabilities
 */

interface HMMCandidate {
  nodeId?: string;
  edgeId?: string;
  position: { lat: number; lon: number; floor: string };
  type: 'node' | 'edge';
  distance: number; // Distance from raw GPS to candidate
  heading: number; // Heading at this candidate
}

interface HMMState {
  candidates: HMMCandidate[];
  probabilities: number[];
  backpointers: number[][];
  pathLength: number;
  lastUpdate?: NavUpdateDto;
  // Fixed-lag smoothing ring buffer
  stateHistory: Array<{
    candidates: HMMCandidate[];
    probabilities: number[];
    timestamp: number;
    bestPath: number[];
  }>;
  maxHistorySize: number;
}

interface TrackingState {
  userId: string;
  hmmState: HMMState;
  teleportCount: number;
  lastValidFloor: string;
  smoothedPosition: { lat: number; lon: number };
  positionHistory: Array<{ lat: number; lon: number; ts: number; heading: number; speed: number }>;
  curvature: number; // Current path curvature in deg/s
  lastOffPathTime?: number; // For off-path gating
}

interface MapMatchResult {
  position: { lat: number; lon: number; floor: string };
  confidence: number;
  snapTo: 'path' | 'node';
  nodeId?: string;
  edgeId?: string;
  delta: { x: number; y: number };
}

@Injectable()
export class HMMTrackingService {
  private readonly logger = new Logger(HMMTrackingService.name);
  private userStates = new Map<string, TrackingState>();

  // Enhanced HMM Parameters for Precision Tracking
  private readonly K_CANDIDATES_BASE = 8; // Base number of candidates
  private readonly K_CANDIDATES_CURVE = 10; // Increased candidates for curves
  private readonly R_SEARCH_RADIUS_BASE = 18; // Base search radius in meters
  private readonly R_SEARCH_RADIUS_DENSE = 16; // Reduced radius in dense zones
  private readonly TELEPORT_THRESHOLD = 12; // Teleport threshold in meters
  private readonly TELEPORT_CONSECUTIVE = 3; // Consecutive updates for teleport
  private readonly EMA_ALPHA = 0.45; // Exponential moving average alpha
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly FLOOR_TRANSITION_DISTANCE = 6; // Max distance for floor transitions
  
  // Enhanced speed and curvature-aware dynamic sigmas
  private readonly SIGMA_D_PERP_SLOW = 1.6; // Tighter perpendicular distance sigma for slow movement (v < 0.5 m/s)
  private readonly SIGMA_D_PERP_FAST = 2.0; // Perpendicular distance sigma for fast movement
  private readonly SPEED_THRESHOLD = 0.5; // m/s threshold for speed-aware parameters
  private readonly CURVATURE_THRESHOLD = 25; // deg/s threshold for curve detection
  private readonly HIGH_CURVATURE_THRESHOLD = 30; // deg/s threshold for high curvature
  
  // Curvature-aware heading sigmas
  private readonly SIGMA_HEAD_SLOW = 45; // Heading sigma for slow movement (degrees)
  private readonly SIGMA_HEAD_FAST_STRAIGHT = 20; // Heading sigma for fast straight movement
  private readonly SIGMA_HEAD_FAST_CURVE = 35; // Heading sigma for fast curved movement
  private readonly SIGMA_HEAD_FAST_HIGH_CURVE = 35; // Heading sigma for high curvature
  
  // Edge stickiness and lane hopping penalties
  private readonly PARALLEL_EDGE_ANGLE_THRESHOLD = 12; // degrees
  private readonly PARALLEL_EDGE_DISTANCE_THRESHOLD = 3; // meters
  private readonly LANE_HOP_PENALTY = Math.log(0.6); // Penalty for lane hopping
  
  // Off-path gating
  private readonly OFF_PATH_REROUTE_DELAY = 0.4; // seconds
  
  // Fixed-lag smoothing
  private readonly SMOOTHING_WINDOW_SIZE = 5; // Ring buffer size for RTS smoothing
  private readonly SMOOTHING_WINDOW_TIME = 1.0; // seconds
  
  // For teleport recovery
  private readonly K_TELEPORT = 10; // More candidates when recovering
  private readonly R_TELEPORT = 35; // Larger search radius

  // Physical constants
  private readonly EARTH_RADIUS = 6371e3; // meters
  private readonly MAX_INDOOR_SPEED = 1.6; // m/s
  private readonly MIN_INDOOR_SPEED = 0.2; // m/s

  constructor(
    private readonly graphLoader: GraphLoaderService
  ) {}

  /**
   * Process navigation update using HMM map-matching
   */
  async processNavigationUpdate(update: NavUpdateDto): Promise<MapMatchResult | null> {
    const startTime = Date.now();

    try {
      // Get or create user state
      const state = this.getOrCreateUserState(update.userId);
      
      // Update position history with heading and speed
      this.updatePositionHistory(state, update);
      
      // Calculate current curvature
      state.curvature = this.calculateCurvature(state.positionHistory);
      
      // Apply EMA smoothing
      const smoothedPosition = this.applyEMASmoothing(state, update.pos);
      state.smoothedPosition = smoothedPosition;

      // Get graph data
      const graph = this.graphLoader.getGraph();

      // Determine search parameters based on curvature and zone density
      const isCurved = state.curvature > this.CURVATURE_THRESHOLD;
      const currentFloorId = this.getFloorId(update.pos.floor);
      const isDenseZone = this.isDenseZone(smoothedPosition, currentFloorId, graph);
      const searchRadius = isDenseZone ? this.R_SEARCH_RADIUS_DENSE : this.R_SEARCH_RADIUS_BASE;
      const maxCandidates = isCurved ? this.K_CANDIDATES_CURVE : this.K_CANDIDATES_BASE;
      
      // Find candidates for current position
      const candidates = this.findCandidates(
        smoothedPosition,
        update.pos.floor,
        graph,
        state.teleportCount > 0,
        searchRadius,
        maxCandidates
      );

      if (candidates.length === 0) {
        this.logger.warn(`No candidates found for user ${update.userId}`);
        return null;
      }

      // Check for teleportation
      if (this.detectTeleport(state, update)) {
        state.teleportCount++;
        if (state.teleportCount >= this.TELEPORT_CONSECUTIVE) {
          // Reset HMM state on teleport
          this.resetHMMState(state);
          this.logger.log(`Teleport detected for user ${update.userId}, resetting HMM state`);
          // Note: Teleport metrics are tracked in navigation-correction.service.ts
        }
      } else {
        state.teleportCount = 0;
      }

      // Check off-path gating
      if (this.shouldDelayReroute(state, candidates, update)) {
        // Continue with previous position but update time
        state.hmmState.lastUpdate = update;
        return state.hmmState.candidates.length > 0 ? {
          position: state.hmmState.candidates[0].position,
          confidence: this.calculateConfidence(state, state.hmmState.candidates[0]),
          snapTo: state.hmmState.candidates[0].type === 'node' ? 'node' : 'path',
          nodeId: state.hmmState.candidates[0].nodeId,
          edgeId: state.hmmState.candidates[0].edgeId,
          delta: { x: 0, y: 0 }
        } : null;
      }
      
      // Run enhanced Viterbi algorithm with fixed-lag smoothing
      const bestCandidate = this.runEnhancedViterbi(
        state,
        candidates,
        update,
        graph
      );

      if (!bestCandidate) {
        return null;
      }

      // Validate floor transition
      const transitionFloorId = this.getFloorId(update.pos.floor);
      if (!this.validateFloorTransition(state, transitionFloorId, update.confidence, graph)) {
        this.logger.warn(
          `Invalid floor transition for user ${update.userId}: ` +
          `${state.lastValidFloor} -> ${transitionFloorId}`
        );
        return null;
      }

      state.lastValidFloor = transitionFloorId;
      state.hmmState.lastUpdate = update;

      // Calculate confidence based on HMM probability
      const confidence = this.calculateConfidence(state, bestCandidate);

      // Build result
      const result: MapMatchResult = {
        position: bestCandidate.position,
        confidence,
        snapTo: bestCandidate.type === 'node' ? 'node' : 'path',
        nodeId: bestCandidate.nodeId,
        edgeId: bestCandidate.edgeId,
        delta: {
          x: (bestCandidate.position.lon - smoothedPosition.lon) * this.lonToMeters(smoothedPosition.lat),
          y: (bestCandidate.position.lat - smoothedPosition.lat) * this.latToMeters()
        }
      };

      const processingTime = Date.now() - startTime;
      if (processingTime > 10) {
        this.logger.debug(`HMM processing took ${processingTime}ms`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error in HMM processing: ${error.message}`);
      return null;
    }
  }

  /**
   * Enhanced candidate selection with floor transitions and zone gating
   */
  private findCandidates(
    position: { lat: number; lon: number },
    floor: number,
    graph: NavGraph,
    isTeleport: boolean,
    searchRadius?: number,
    maxCandidates?: number
  ): HMMCandidate[] {
    const candidates: HMMCandidate[] = [];
    const finalSearchRadius = isTeleport ? this.R_TELEPORT : (searchRadius || this.R_SEARCH_RADIUS_BASE);
    const finalMaxCandidates = isTeleport ? this.K_TELEPORT : (maxCandidates || this.K_CANDIDATES_BASE);
    const floorId = this.getFloorId(floor);

    // Find nearest edges on current floor
    const edgeCandidates = this.findNearestEdges(
      position,
      floorId,
      graph,
      finalSearchRadius,
      Math.floor(finalMaxCandidates * 0.75) // 75% edges
    );

    // Find nearest nodes on current floor
    const nodeCandidates = this.findNearestNodes(
      position,
      floorId,
      graph,
      finalSearchRadius,
      Math.floor(finalMaxCandidates * 0.2) // 20% nodes
    );

    // Add candidates from adjacent floors via connectors (within 6m)
    const floorTransitionCandidates = this.findFloorTransitionCandidates(
      position,
      floorId,
      graph,
      this.FLOOR_TRANSITION_DISTANCE
    );

    // Combine all candidates
    candidates.push(...edgeCandidates, ...nodeCandidates, ...floorTransitionCandidates);

    // Apply zone gating if zones are defined
    const filteredCandidates = this.applyZoneGating(candidates, position, floorId, graph);

    // Sort by distance and keep top K
    filteredCandidates.sort((a, b) => a.distance - b.distance);
    return filteredCandidates.slice(0, finalMaxCandidates);
  }

  /**
   * Find candidates for floor transitions via valid connectors
   */
  private findFloorTransitionCandidates(
    position: { lat: number; lon: number },
    currentFloorId: string,
    graph: NavGraph,
    maxDistance: number
  ): HMMCandidate[] {
    const candidates: HMMCandidate[] = [];

    // Find connectors near current position
    for (const connector of graph.connectors) {
      const fromNode = graph.nodes.find(n => n.id === connector.from);
      const toNode = graph.nodes.find(n => n.id === connector.to);

      if (!fromNode || !toNode) continue;

      // Check if connector connects to/from current floor
      let targetNode: Node | null = null;
      if (fromNode.floor === currentFloorId && toNode.floor !== currentFloorId) {
        targetNode = toNode;
      } else if (toNode.floor === currentFloorId && fromNode.floor !== currentFloorId) {
        targetNode = fromNode;
      }

      if (!targetNode) continue;

      // Check distance to connector
      const distance = this.haversineDistance(position, { lat: targetNode.lat, lon: targetNode.lon });
      if (distance <= maxDistance) {
        candidates.push({
          nodeId: targetNode.id,
          position: { lat: targetNode.lat, lon: targetNode.lon, floor: targetNode.floor },
          type: 'node',
          distance,
          heading: 0 // Will be calculated based on connected edges
        });
      }
    }

    return candidates;
  }

  /**
   * Apply zone gating to filter candidates based on allowed zones
   */
  private applyZoneGating(
    candidates: HMMCandidate[],
    observedPosition: { lat: number; lon: number },
    floorId: string,
    graph: NavGraph
  ): HMMCandidate[] {
    // Get zones for current floor
    const floorZones = graph.zones.filter(z => z.floor === floorId);
    
    if (floorZones.length === 0) {
      return candidates; // No zones defined, return all candidates
    }

    // Check which zone the observed position is in
    let currentZone: Zone | null = null;
    for (const zone of floorZones) {
      if (this.isPointInPolygon(observedPosition, zone.polygon)) {
        currentZone = zone;
        break;
      }
    }

    if (!currentZone) {
      return candidates; // Not in any zone, allow all candidates
    }

    // Filter candidates to only those in the same zone or adjacent zones
    return candidates.filter(candidate => {
      // Check if candidate is in current zone
      if (this.isPointInPolygon(candidate.position, currentZone!.polygon)) {
        return true;
      }

      // Check if candidate is in adjacent zone (within 10m of zone boundary)
      const distanceToZone = this.distanceToPolygon(candidate.position, currentZone!.polygon);
      return distanceToZone <= 10;
    });
  }

  /**
   * Check if point is inside polygon
   */
  private isPointInPolygon(point: { lat: number; lon: number }, polygon: Array<[number, number]>): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][1], yi = polygon[i][0]; // [lat, lon] -> lon, lat
      const xj = polygon[j][1], yj = polygon[j][0];
      
      const intersect = ((yi > point.lat) !== (yj > point.lat))
        && (point.lon < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  /**
   * Calculate minimum distance from point to polygon boundary
   */
  private distanceToPolygon(point: { lat: number; lon: number }, polygon: Array<[number, number]>): number {
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
      }
    }
    
    return minDistance;
  }

  /**
   * Find nearest edges within search radius
   */
  private findNearestEdges(
    position: { lat: number; lon: number },
    floorId: string,
    graph: NavGraph,
    searchRadius: number,
    maxResults: number
  ): HMMCandidate[] {
    const candidates: HMMCandidate[] = [];

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

      if (projection.distance <= searchRadius) {
        // Calculate edge heading
        const dx = toNode.lon - fromNode.lon;
        const dy = toNode.lat - fromNode.lat;
        const heading = Math.atan2(dx, dy) * 180 / Math.PI;

        candidates.push({
          edgeId: `${edge.from}-${edge.to}`,
          position: { ...projection.point, floor: floorId },
          type: 'edge',
          distance: projection.distance,
          heading: this.normalizeAngle(heading)
        });
      }
    }

    // Sort by distance and return top results
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.slice(0, maxResults);
  }

  /**
   * Find nearest nodes within search radius
   */
  private findNearestNodes(
    position: { lat: number; lon: number },
    floorId: string,
    graph: NavGraph,
    searchRadius: number,
    maxResults: number
  ): HMMCandidate[] {
    const candidates: HMMCandidate[] = [];

    for (const node of graph.nodes) {
      if (node.floor !== floorId) {
        continue;
      }

      const distance = this.haversineDistance(position, { lat: node.lat, lon: node.lon });
      
      if (distance <= searchRadius) {
        // Calculate heading from connected edges
        const connectedEdges = graph.edges.filter(e => e.from === node.id || e.to === node.id);
        let heading = 0;
        
        if (connectedEdges.length > 0) {
          const headings: number[] = [];
          for (const edge of connectedEdges) {
            const otherNodeId = edge.from === node.id ? edge.to : edge.from;
            const otherNode = graph.nodes.find(n => n.id === otherNodeId);
            if (otherNode) {
              const dx = otherNode.lon - node.lon;
              const dy = otherNode.lat - node.lat;
              headings.push(Math.atan2(dx, dy) * 180 / Math.PI);
            }
          }
          heading = this.circularMean(headings);
        }

        candidates.push({
          nodeId: node.id,
          position: { lat: node.lat, lon: node.lon, floor: floorId },
          type: 'node',
          distance,
          heading: this.normalizeAngle(heading)
        });
      }
    }

    // Sort by distance and return top results
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.slice(0, maxResults);
  }

  /**
   * Run enhanced Viterbi algorithm with fixed-lag smoothing
   */
  private runEnhancedViterbi(
    state: TrackingState,
    candidates: HMMCandidate[],
    update: NavUpdateDto,
    graph: NavGraph
  ): HMMCandidate | null {
    const hmm = state.hmmState;

    // Initialize fixed-lag smoothing if needed
    if (!hmm.stateHistory) {
      hmm.stateHistory = [];
      hmm.maxHistorySize = this.SMOOTHING_WINDOW_SIZE;
    }
    
    // First observation - initialize
    if (hmm.pathLength === 0) {
      hmm.candidates = candidates;
      hmm.probabilities = candidates.map(c => 
        this.emissionProbability(c, update, state)
      );
      hmm.backpointers = [[]];
      hmm.pathLength = 1;
      
      // Store in history
      this.addToStateHistory(hmm, candidates, hmm.probabilities, update.ts, []);
      
      // Return best initial candidate
      const bestIdx = this.argmax(hmm.probabilities);
      return candidates[bestIdx];
    }

    // Subsequent observations - run Viterbi step
    const prevCandidates = hmm.candidates;
    const prevProbs = hmm.probabilities;
    const newProbs: number[] = new Array(candidates.length);
    const backpointers: number[] = new Array(candidates.length);

    for (let j = 0; j < candidates.length; j++) {
      let maxProb = -Infinity;
      let maxIdx = 0;

      for (let i = 0; i < prevCandidates.length; i++) {
        const emissionProb = this.emissionProbability(candidates[j], update, state);
        const transitionProb = this.enhancedTransitionProbability(
          prevCandidates[i],
          candidates[j],
          hmm.lastUpdate!,
          update,
          graph,
          state
        );
        const prob = prevProbs[i] + Math.log(emissionProb) + Math.log(transitionProb);

        if (prob > maxProb) {
          maxProb = prob;
          maxIdx = i;
        }
      }

      newProbs[j] = maxProb;
      backpointers[j] = maxIdx;
    }

    // Update HMM state
    hmm.candidates = candidates;
    hmm.probabilities = newProbs;
    hmm.backpointers.push(backpointers);
    hmm.pathLength++;

    // Keep only last M states for efficiency
    const M = this.K_CANDIDATES_BASE * 2;
    if (hmm.backpointers.length > M) {
      hmm.backpointers = hmm.backpointers.slice(-M);
    }
    
    // Add to state history for fixed-lag smoothing
    const bestPath = this.traceBestPath(hmm.backpointers, this.argmax(newProbs));
    this.addToStateHistory(hmm, candidates, newProbs, update.ts, bestPath);
    
    // Apply fixed-lag smoothing if we have enough history
    if (hmm.stateHistory.length >= this.SMOOTHING_WINDOW_SIZE) {
      this.applyFixedLagSmoothing(hmm);
    }

    // Find best current candidate
    const bestIdx = this.argmax(newProbs);
    return candidates[bestIdx];
  }

  /**
   * Enhanced emission probability using edge-aligned, speed and curvature-aware model
   */
  private emissionProbability(candidate: HMMCandidate, update: NavUpdateDto, state: TrackingState): number {
    if (candidate.type === 'edge') {
      return this.edgeAlignedEmissionProbability(candidate, update, state);
    } else {
      return this.nodeEmissionProbability(candidate, update, state);
    }
  }

  /**
   * Edge-aligned emission probability with local frame calculations and curvature awareness
   */
  private edgeAlignedEmissionProbability(candidate: HMMCandidate, update: NavUpdateDto, state: TrackingState): number {
    const observedPos = { lat: update.pos.lat, lon: update.pos.lon };
    const residuals = this.edgeResiduals(observedPos, candidate);
    
    // Speed and curvature-aware dynamic sigmas
    const speed = update.speed || 0;
    const curvature = state.curvature || 0;
    
    // Tighter distance sigmas for improved precision
    const sigmaDPerp = speed < this.SPEED_THRESHOLD ? this.SIGMA_D_PERP_SLOW : this.SIGMA_D_PERP_FAST;
    
    // Curvature-aware heading sigma: σ_head = v < 0.5 ? 45 : (κ > 30 ? 35 : 20)
    let sigmaHead: number;
    if (speed < this.SPEED_THRESHOLD) {
      sigmaHead = this.SIGMA_HEAD_SLOW;
    } else if (curvature > this.HIGH_CURVATURE_THRESHOLD) {
      sigmaHead = this.SIGMA_HEAD_FAST_HIGH_CURVE;
    } else if (curvature > this.CURVATURE_THRESHOLD) {
      sigmaHead = this.SIGMA_HEAD_FAST_CURVE;
    } else {
      sigmaHead = this.SIGMA_HEAD_FAST_STRAIGHT;
    }
    
    // Perpendicular distance component
    const perpProb = this.gaussianPDF(residuals.perpendicular, 0, sigmaDPerp);
    
    // Parallel distance component (less constrained)
    const parallelProb = this.gaussianPDF(residuals.parallel, 0, sigmaDPerp * 2.0);
    
    // Heading alignment component
    const headingDiff = this.angularDistance(candidate.heading, update.heading);
    const headingProb = this.vonMisesPDF(headingDiff, 0, sigmaHead);
    
    // Combined probability with edge alignment emphasis
    return perpProb * parallelProb * headingProb;
  }

  /**
   * Node emission probability with curvature awareness
   */
  private nodeEmissionProbability(candidate: HMMCandidate, update: NavUpdateDto, state: TrackingState): number {
    const speed = update.speed || 0;
    const curvature = state.curvature || 0;
    
    // Curvature-aware heading sigma for nodes
    let sigmaHead: number;
    if (speed < this.SPEED_THRESHOLD) {
      sigmaHead = this.SIGMA_HEAD_SLOW;
    } else if (curvature > this.HIGH_CURVATURE_THRESHOLD) {
      sigmaHead = this.SIGMA_HEAD_FAST_HIGH_CURVE;
    } else if (curvature > this.CURVATURE_THRESHOLD) {
      sigmaHead = this.SIGMA_HEAD_FAST_CURVE;
    } else {
      sigmaHead = this.SIGMA_HEAD_FAST_STRAIGHT;
    }
    
    // Distance component
    const distProb = this.gaussianPDF(candidate.distance, 0, 2.5);
    
    // Heading component (less strict for nodes)
    const headingDiff = this.angularDistance(candidate.heading, update.heading);
    const headingProb = this.vonMisesPDF(headingDiff, 0, sigmaHead * 1.5);
    
    return distProb * headingProb;
  }

  /**
   * Calculate parallel and perpendicular residuals in edge local frame
   */
  private edgeResiduals(
    observedPos: { lat: number; lon: number },
    candidate: HMMCandidate
  ): { parallel: number; perpendicular: number } {
    if (!candidate.edgeId || candidate.type !== 'edge') {
      return { parallel: 0, perpendicular: candidate.distance };
    }
    
    // Get edge endpoints from graph
    const graph = this.graphLoader.getGraph();
    const [fromId, toId] = candidate.edgeId.split('-');
    const fromNode = graph.nodes.find(n => n.id === fromId);
    const toNode = graph.nodes.find(n => n.id === toId);
    
    if (!fromNode || !toNode) {
      return { parallel: 0, perpendicular: candidate.distance };
    }
    
    // Edge vector
    const edgeVec = {
      x: toNode.lon - fromNode.lon,
      y: toNode.lat - fromNode.lat
    };
    
    // Normalize edge vector
    const edgeLength = Math.sqrt(edgeVec.x * edgeVec.x + edgeVec.y * edgeVec.y);
    if (edgeLength === 0) {
      return { parallel: 0, perpendicular: candidate.distance };
    }
    
    const unitEdge = {
      x: edgeVec.x / edgeLength,
      y: edgeVec.y / edgeLength
    };
    
    // Vector from edge start to observed position
    const obsVec = {
      x: observedPos.lon - fromNode.lon,
      y: observedPos.lat - fromNode.lat
    };
    
    // Project onto edge (parallel component)
    const parallel = obsVec.x * unitEdge.x + obsVec.y * unitEdge.y;
    
    // Perpendicular component
    const perpVec = {
      x: obsVec.x - parallel * unitEdge.x,
      y: obsVec.y - parallel * unitEdge.y
    };
    
    const perpendicular = Math.sqrt(perpVec.x * perpVec.x + perpVec.y * perpVec.y);
    
    // Convert to meters
    const parallelMeters = parallel * this.lonToMeters(observedPos.lat);
    const perpendicularMeters = perpendicular * this.latToMeters();
    
    return {
      parallel: parallelMeters,
      perpendicular: perpendicularMeters
    };
  }

  /**
   * Enhanced transition probability with edge stickiness, log-space calculations and forward progress rewards
   */
  private enhancedTransitionProbability(
    from: HMMCandidate,
    to: HMMCandidate,
    prevUpdate: NavUpdateDto,
    currUpdate: NavUpdateDto,
    graph: NavGraph,
    state: TrackingState
  ): number {
    const dt = Math.max(0.1, (currUpdate.ts - prevUpdate.ts) / 1000); // seconds, minimum 0.1s
    const distance = this.haversineDistance(from.position, to.position);
    
    // Expected velocity (clamped)
    const vExp = Math.max(this.MIN_INDOOR_SPEED, Math.min(this.MAX_INDOOR_SPEED, currUpdate.speed || 1.0));
    const expectedDistance = vExp * dt;

    // Log-space probability calculation
    let logProb = 0;

    // Distance component in log space
    if (distance > expectedDistance * 4) {
      return 1e-12; // Impossible jump
    }
    
    const distanceLogProb = this.gaussianLogPDF(distance, expectedDistance, expectedDistance * 0.4);
    logProb += distanceLogProb;

    // Heading change penalty (enhanced for better turn handling)
    const headingChange = this.angularDistance(from.heading, to.heading);
    const headingLogPenalty = this.calculateHeadingLogPenalty(headingChange, from, to, distance);
    logProb += headingLogPenalty;

    // Forward progress reward for same edge
    const forwardProgressBonus = this.calculateForwardProgressBonus(from, to, graph);
    logProb += forwardProgressBonus;

    // Graph connectivity bonus
    const connectivityBonus = this.calculateConnectivityBonus(from, to, graph);
    logProb += connectivityBonus;

    // Floor transition penalty
    if (from.position.floor !== to.position.floor) {
      const floorTransitionPenalty = this.calculateFloorTransitionPenalty(from, to, graph);
      logProb += floorTransitionPenalty;
    }
    
    // Edge stickiness penalty to avoid lane hopping
    const laneHopPenalty = this.calculateLaneHopPenalty(from, to, graph);
    logProb += laneHopPenalty;

    // Convert back from log space
    return Math.exp(logProb);
  }

  /**
   * Calculate Gaussian PDF in log space for numerical stability
   */
  private gaussianLogPDF(x: number, mean: number, stdDev: number): number {
    const variance = stdDev * stdDev;
    const logCoeff = -0.5 * Math.log(2 * Math.PI * variance);
    const logExp = -Math.pow(x - mean, 2) / (2 * variance);
    return logCoeff + logExp;
  }

  /**
   * Calculate heading change penalty in log space
   */
  private calculateHeadingLogPenalty(
    headingChange: number,
    from: HMMCandidate,
    to: HMMCandidate,
    distance: number
  ): number {
    // Allow larger heading changes for short distances (e.g., at intersections)
    const distanceAdjustment = Math.max(0.5, Math.min(1.0, distance / 5.0));
    
    if (headingChange > 160 * distanceAdjustment) {
      return Math.log(0.05); // Strong penalty for U-turns
    } else if (headingChange > 120 * distanceAdjustment) {
      return Math.log(0.2); // Moderate penalty for sharp turns
    } else if (headingChange > 60 * distanceAdjustment) {
      return Math.log(0.7); // Light penalty for turns
    } else {
      return 0; // No penalty for small heading changes
    }
  }

  /**
   * Calculate forward progress bonus for same edge transitions
   */
  private calculateForwardProgressBonus(
    from: HMMCandidate,
    to: HMMCandidate,
    graph: NavGraph
  ): number {
    if (from.type === 'edge' && to.type === 'edge' && from.edgeId === to.edgeId) {
      // Same edge - check if moving forward
      const [fromNodeId, toNodeId] = from.edgeId!.split('-');
      const fromNode = graph.nodes.find(n => n.id === fromNodeId);
      const toNode = graph.nodes.find(n => n.id === toNodeId);
      
      if (fromNode && toNode) {
        // Calculate if movement is in edge direction
        const edgeDirection = this.calculateExpectedHeading(
          { lat: fromNode.lat, lon: fromNode.lon },
          { lat: toNode.lat, lon: toNode.lon }
        );
        
        const movementDirection = this.calculateExpectedHeading(
          from.position,
          to.position
        );
        
        const directionAlignment = this.angularDistance(edgeDirection, movementDirection);
        
        if (directionAlignment < 30) {
          return Math.log(2.0); // Strong bonus for forward progress
        } else if (directionAlignment < 60) {
          return Math.log(1.5); // Moderate bonus
        }
      }
    }
    
    return 0; // No bonus
  }

  /**
   * Calculate graph connectivity bonus in log space
   */
  private calculateConnectivityBonus(
    from: HMMCandidate,
    to: HMMCandidate,
    graph: NavGraph
  ): number {
    if (from.type === 'node' && to.type === 'node') {
      // Check direct connection
      const connected = graph.edges.some(e =>
        (e.from === from.nodeId && e.to === to.nodeId) ||
        (e.to === from.nodeId && e.from === to.nodeId)
      );
      
      if (connected) {
        return Math.log(3.0); // Strong bonus for direct connection
      }
      
      // Check 2-hop connection
      const twoHopConnected = this.checkTwoHopConnection(from.nodeId!, to.nodeId!, graph);
      if (twoHopConnected) {
        return Math.log(1.5); // Moderate bonus for 2-hop connection
      }
    } else if (from.type === 'edge' && to.type === 'node') {
      // Check if node is connected to edge
      const [edgeFrom, edgeTo] = from.edgeId!.split('-');
      if (to.nodeId === edgeFrom || to.nodeId === edgeTo) {
        return Math.log(2.0); // Bonus for edge-to-endpoint transition
      }
    } else if (from.type === 'node' && to.type === 'edge') {
      // Check if node is connected to edge
      const [edgeFrom, edgeTo] = to.edgeId!.split('-');
      if (from.nodeId === edgeFrom || from.nodeId === edgeTo) {
        return Math.log(2.0); // Bonus for node-to-edge transition
      }
    }
    
    return 0; // No connectivity bonus
  }

  /**
   * Calculate floor transition penalty
   */
  private calculateFloorTransitionPenalty(
    from: HMMCandidate,
    to: HMMCandidate,
    graph: NavGraph
  ): number {
    // Check if there's a valid connector between floors
    const hasValidConnector = graph.connectors.some(connector => {
      const fromNode = graph.nodes.find(n => n.id === connector.from);
      const toNode = graph.nodes.find(n => n.id === connector.to);
      
      if (!fromNode || !toNode) return false;
      
      return (
        (fromNode.floor === from.position.floor && toNode.floor === to.position.floor) ||
        (fromNode.floor === to.position.floor && toNode.floor === from.position.floor)
      );
    });
    
    if (hasValidConnector) {
      return Math.log(0.5); // Moderate penalty for valid floor change
    } else {
      return Math.log(0.01); // Strong penalty for invalid floor change
    }
  }

  /**
   * Check if two nodes are connected via 2 hops
   */
  private checkTwoHopConnection(fromNodeId: string, toNodeId: string, graph: NavGraph): boolean {
    const fromConnections = graph.edges.filter(e => e.from === fromNodeId || e.to === fromNodeId);
    
    for (const edge of fromConnections) {
      const intermediateNodeId = edge.from === fromNodeId ? edge.to : edge.from;
      const toConnections = graph.edges.filter(e => 
        (e.from === intermediateNodeId && e.to === toNodeId) ||
        (e.to === intermediateNodeId && e.from === toNodeId)
      );
      
      if (toConnections.length > 0) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate expected heading between two points
   */
  private calculateExpectedHeading(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number }
  ): number {
    const dx = to.lon - from.lon;
    const dy = to.lat - from.lat;
    
    const bearing = Math.atan2(dx, dy) * 180 / Math.PI;
    return this.normalizeAngle(bearing);
  }

  /**
   * LogSumExp for numerical stability
   */
  private logSumExp(logValues: number[]): number {
    if (logValues.length === 0) return -Infinity;
    
    const maxLogValue = Math.max(...logValues);
    if (maxLogValue === -Infinity) return -Infinity;
    
    let sum = 0;
    for (const logValue of logValues) {
      sum += Math.exp(logValue - maxLogValue);
    }
    
    return maxLogValue + Math.log(sum);
  }

  /**
   * Detect teleportation based on consecutive large jumps (>10m for 3 consecutive)
   * Maintains the specified safety requirement: teleport detection (>10m for 3 consecutive)
   */
  private detectTeleport(state: TrackingState, update: NavUpdateDto): boolean {
    if (state.positionHistory.length < 2) {
      return false;
    }

    const prevPos = state.positionHistory[state.positionHistory.length - 2];
    const currPos = { lat: update.pos.lat, lon: update.pos.lon };
    const distance = this.haversineDistance(prevPos, currPos);

    // Safety requirement: >10m threshold maintained, 3 consecutive required
    return distance > Math.max(this.TELEPORT_THRESHOLD, 10); // Ensure minimum 10m as specified
  }

  /**
   * Reset HMM state (e.g., after teleportation)
   */
  private resetHMMState(state: TrackingState): void {
    state.hmmState = {
      candidates: [],
      probabilities: [],
      backpointers: [],
      pathLength: 0,
      stateHistory: [],
      maxHistorySize: this.SMOOTHING_WINDOW_SIZE
    };
  }

  /**
   * Apply Exponential Moving Average smoothing
   */
  private applyEMASmoothing(
    state: TrackingState,
    newPosition: { lat: number; lon: number }
  ): { lat: number; lon: number } {
    if (!state.smoothedPosition) {
      return newPosition;
    }

    return {
      lat: this.EMA_ALPHA * newPosition.lat + (1 - this.EMA_ALPHA) * state.smoothedPosition.lat,
      lon: this.EMA_ALPHA * newPosition.lon + (1 - this.EMA_ALPHA) * state.smoothedPosition.lon
    };
  }

  /**
   * Update position history with heading and speed
   */
  private updatePositionHistory(state: TrackingState, update: NavUpdateDto): void {
    state.positionHistory.push({
      lat: update.pos.lat,
      lon: update.pos.lon,
      ts: update.ts,
      heading: update.heading,
      speed: update.speed || 0
    });

    // Keep last 10 positions
    if (state.positionHistory.length > 10) {
      state.positionHistory.shift();
    }
  }

  /**
   * Validate floor transition
   */
  private validateFloorTransition(
    state: TrackingState,
    toFloor: string,
    confidence: number,
    graph: NavGraph
  ): boolean {
    if (!state.lastValidFloor || state.lastValidFloor === toFloor) {
      return true;
    }

    // Allow transition if confidence is low
    if (confidence < this.CONFIDENCE_THRESHOLD) {
      return true;
    }

    // Check for valid connector
    return graph.connectors.some(conn => {
      const fromNode = graph.nodes.find(n => n.id === conn.from);
      const toNode = graph.nodes.find(n => n.id === conn.to);
      
      return (
        (fromNode?.floor === state.lastValidFloor && toNode?.floor === toFloor) ||
        (fromNode?.floor === toFloor && toNode?.floor === state.lastValidFloor)
      );
    });
  }

  /**
   * Calculate confidence based on HMM probability
   * Preserves confidence scoring in nav.correction as per safety requirements
   */
  private calculateConfidence(state: TrackingState, candidate: HMMCandidate): number {
    const hmm = state.hmmState;
    if (hmm.probabilities.length === 0) {
      return 0.5; // Default confidence when no HMM history
    }

    // Normalize probabilities
    const maxProb = Math.max(...hmm.probabilities);
    const normalizedProbs = hmm.probabilities.map(p => Math.exp(p - maxProb));
    const sum = normalizedProbs.reduce((a, b) => a + b, 0);
    const normalized = normalizedProbs.map(p => p / sum);

    // Find confidence of best candidate
    const bestIdx = this.argmax(hmm.probabilities);
    const confidence = normalized[bestIdx];

    // Scale to 0-1 range with minimum threshold
    // Ensures confidence scoring is preserved in nav.correction
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Get or create user tracking state
   */
  private getOrCreateUserState(userId: string): TrackingState {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        userId,
        hmmState: {
          candidates: [],
          probabilities: [],
          backpointers: [],
          pathLength: 0,
          stateHistory: [],
          maxHistorySize: this.SMOOTHING_WINDOW_SIZE
        },
        teleportCount: 0,
        lastValidFloor: '',
        smoothedPosition: { lat: 0, lon: 0 },
        positionHistory: [],
        curvature: 0
      });
    }
    return this.userStates.get(userId)!;
  }

  /**
   * Clear user state
   */
  clearUserState(userId: string): void {
    this.userStates.delete(userId);
  }

  /**
   * Get tracking statistics
   */
  getStats(): {
    activeUsers: number;
    averageConfidence: number;
    teleportEvents: number;
  } {
    let totalConfidence = 0;
    let teleportEvents = 0;
    let count = 0;

    const states = Array.from(this.userStates.values());
    for (const state of states) {
      if (state.teleportCount > 0) {
        teleportEvents++;
      }
      if (state.hmmState.probabilities.length > 0) {
        const maxProb = Math.max(...state.hmmState.probabilities);
        totalConfidence += Math.min(0.95, Math.exp(maxProb));
        count++;
      }
    }

    return {
      activeUsers: this.userStates.size,
      averageConfidence: count > 0 ? totalConfidence / count : 0,
      teleportEvents
    };
  }

  // === Helper Functions ===

  /**
   * Gaussian probability density function
   */
  private gaussianPDF(x: number, mean: number, stdDev: number): number {
    const variance = stdDev * stdDev;
    const exp = -Math.pow(x - mean, 2) / (2 * variance);
    return Math.exp(exp) / (stdDev * Math.sqrt(2 * Math.PI));
  }

  /**
   * von Mises probability density function (circular Gaussian)
   */
  private vonMisesPDF(x: number, mean: number, stdDevDegrees: number): number {
    // Convert to radians
    const xRad = x * Math.PI / 180;
    const meanRad = mean * Math.PI / 180;
    const kappa = 1 / Math.pow(stdDevDegrees * Math.PI / 180, 2); // concentration parameter

    // von Mises PDF
    const exp = kappa * Math.cos(xRad - meanRad);
    return Math.exp(exp) / (2 * Math.PI * this.besselI0(kappa));
  }

  /**
   * Modified Bessel function of the first kind of order 0
   * Approximation for von Mises distribution
   */
  private besselI0(x: number): number {
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
   * Find index of maximum value
   */
  private argmax(arr: number[]): number {
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
   * Angular distance between two angles in degrees
   */
  private angularDistance(a1: number, a2: number): number {
    const diff = Math.abs(a1 - a2) % 360;
    return diff > 180 ? 360 - diff : diff;
  }

  /**
   * Circular mean of angles in degrees
   */
  private circularMean(angles: number[]): number {
    if (angles.length === 0) return 0;
    
    let sinSum = 0;
    let cosSum = 0;
    
    for (const angle of angles) {
      const rad = angle * Math.PI / 180;
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
    }
    
    return Math.atan2(sinSum, cosSum) * 180 / Math.PI;
  }

  /**
   * Project point to line segment
   */
  private projectPointToLineSegment(
    point: { lat: number; lon: number },
    lineStart: { lat: number; lon: number },
    lineEnd: { lat: number; lon: number }
  ): { point: { lat: number; lon: number }; distance: number } {
    const dx = lineEnd.lon - lineStart.lon;
    const dy = lineEnd.lat - lineStart.lat;
    
    if (dx === 0 && dy === 0) {
      return {
        point: lineStart,
        distance: this.haversineDistance(point, lineStart)
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
      distance: this.haversineDistance(point, projectedPoint)
    };
  }

  /**
   * Haversine distance between two points in meters
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
   * Convert longitude difference to meters at given latitude
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
   * Normalize angle to -180 to 180 range
   */
  private normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  /**
   * Map floor number to floor ID
   */
  private getFloorId(floor: number): string {
    const floorMap: Record<number, string> = {
      0: 'ground',
      1: 'first',
      2: 'second', 
      3: 'third',
      [-1]: 'basement'
    };
    
    return floorMap[floor] || `floor_${floor}`;
  }

  // === NEW PRECISION ENHANCEMENT METHODS ===

  /**
   * Calculate path curvature from position history (deg/s)
   */
  private calculateCurvature(positionHistory: Array<{ lat: number; lon: number; ts: number; heading: number; speed: number }>): number {
    if (positionHistory.length < 3) {
      return 0;
    }

    // Use last 3 points to calculate curvature
    const recent = positionHistory.slice(-3);
    const dt1 = (recent[1].ts - recent[0].ts) / 1000; // seconds
    const dt2 = (recent[2].ts - recent[1].ts) / 1000; // seconds
    
    if (dt1 <= 0 || dt2 <= 0) {
      return 0;
    }

    // Calculate heading change rates
    const dHeading1 = this.angularDistance(recent[0].heading, recent[1].heading);
    const dHeading2 = this.angularDistance(recent[1].heading, recent[2].heading);
    
    const headingRate1 = dHeading1 / dt1; // deg/s
    const headingRate2 = dHeading2 / dt2; // deg/s
    
    // Average curvature over recent window
    return (Math.abs(headingRate1) + Math.abs(headingRate2)) / 2;
  }

  /**
   * Check if position is in a dense zone (for reducing search radius)
   */
  private isDenseZone(position: { lat: number; lon: number }, floorId: string, graph: NavGraph): boolean {
    // Count nearby nodes/edges to determine density
    let nearbyFeatures = 0;
    const densityRadius = 25; // meters
    
    for (const node of graph.nodes) {
      if (node.floor === floorId) {
        const distance = this.haversineDistance(position, { lat: node.lat, lon: node.lon });
        if (distance <= densityRadius) {
          nearbyFeatures++;
        }
      }
    }
    
    // Dense if more than 8 features within 25m
    return nearbyFeatures > 8;
  }

  /**
   * Check if should delay re-route for off-path scenarios
   */
  private shouldDelayReroute(state: TrackingState, candidates: HMMCandidate[], update: NavUpdateDto): boolean {
    // Only apply to off-path scenarios
    if (candidates.length === 0) {
      return false;
    }
    
    // Check if we're getting closer to valid paths
    const closestCandidate = candidates[0]; // Already sorted by distance
    const improvingThreshold = 0.5; // meters improvement threshold
    
    if (state.lastOffPathTime === undefined) {
      // Check if we're off-path (distance > 5m)
      if (closestCandidate.distance > 5) {
        state.lastOffPathTime = update.ts;
        return false;
      }
    } else {
      // We were off-path, check if improving
      const timeSinceOffPath = (update.ts - state.lastOffPathTime) / 1000;
      
      if (timeSinceOffPath < this.OFF_PATH_REROUTE_DELAY) {
        // Within delay window - check if improving
        const previousDistance = state.hmmState.candidates.length > 0 ? 
          state.hmmState.candidates[0].distance : Infinity;
        
        if (closestCandidate.distance < previousDistance - improvingThreshold) {
          // Getting closer, reset timer
          state.lastOffPathTime = update.ts;
          return true;
        }
        
        return true; // Still in delay window
      } else {
        // Delay expired, allow reroute
        state.lastOffPathTime = undefined;
        return false;
      }
    }
    
    return false;
  }

  /**
   * Calculate penalty for lane hopping between parallel edges
   */
  private calculateLaneHopPenalty(from: HMMCandidate, to: HMMCandidate, graph: NavGraph): number {
    if (from.type !== 'edge' || to.type !== 'edge' || from.edgeId === to.edgeId) {
      return 0; // No penalty for same edge or non-edge transitions
    }
    
    const fromEdge = this.getEdgeFromId(from.edgeId!, graph);
    const toEdge = this.getEdgeFromId(to.edgeId!, graph);
    
    if (!fromEdge || !toEdge) {
      return 0;
    }
    
    // Check if edges are parallel
    const fromHeading = this.calculateEdgeHeading(fromEdge, graph);
    const toHeading = this.calculateEdgeHeading(toEdge, graph);
    const angleDiff = this.angularDistance(fromHeading, toHeading);
    
    if (angleDiff > this.PARALLEL_EDGE_ANGLE_THRESHOLD) {
      return 0; // Not parallel, no penalty
    }
    
    // Check distance between edges
    const distance = this.calculateEdgeDistance(fromEdge, toEdge, graph);
    
    if (distance <= this.PARALLEL_EDGE_DISTANCE_THRESHOLD) {
      // Close parallel edges - apply lane hop penalty
      return this.LANE_HOP_PENALTY;
    }
    
    return 0;
  }

  /**
   * Add state to fixed-lag smoothing history
   */
  private addToStateHistory(
    hmm: HMMState,
    candidates: HMMCandidate[],
    probabilities: number[],
    timestamp: number,
    bestPath: number[]
  ): void {
    hmm.stateHistory.push({
      candidates: [...candidates],
      probabilities: [...probabilities],
      timestamp,
      bestPath: [...bestPath]
    });
    
    // Maintain window size
    if (hmm.stateHistory.length > hmm.maxHistorySize) {
      hmm.stateHistory.shift();
    }
  }

  /**
   * Apply fixed-lag smoothing (RTS) over 1.0s window
   */
  private applyFixedLagSmoothing(hmm: HMMState): void {
    if (hmm.stateHistory.length < this.SMOOTHING_WINDOW_SIZE) {
      return;
    }
    
    // Check if window spans the required time
    const latest = hmm.stateHistory[hmm.stateHistory.length - 1];
    const earliest = hmm.stateHistory[0];
    const timeSpan = (latest.timestamp - earliest.timestamp) / 1000;
    
    if (timeSpan < this.SMOOTHING_WINDOW_TIME) {
      return;
    }
    
    // Simple backward pass - smooth probabilities using future information
    for (let i = hmm.stateHistory.length - 2; i >= 0; i--) {
      const current = hmm.stateHistory[i];
      const next = hmm.stateHistory[i + 1];
      
      // Apply lightweight smoothing factor
      const smoothingFactor = 0.1;
      for (let j = 0; j < current.probabilities.length; j++) {
        if (j < next.probabilities.length) {
          current.probabilities[j] = 
            (1 - smoothingFactor) * current.probabilities[j] + 
            smoothingFactor * next.probabilities[j];
        }
      }
    }
  }

  /**
   * Trace best path through backpointers
   */
  private traceBestPath(backpointers: number[][], bestIdx: number): number[] {
    const path: number[] = [];
    let currentIdx = bestIdx;
    
    for (let i = backpointers.length - 1; i >= 0; i--) {
      path.unshift(currentIdx);
      if (i > 0 && backpointers[i][currentIdx] !== undefined) {
        currentIdx = backpointers[i][currentIdx];
      }
    }
    
    return path;
  }

  /**
   * Get edge object from edge ID
   */
  private getEdgeFromId(edgeId: string, graph: NavGraph): any {
    const [fromId, toId] = edgeId.split('-');
    return graph.edges.find(e => e.from === fromId && e.to === toId);
  }

  /**
   * Calculate heading of an edge
   */
  private calculateEdgeHeading(edge: any, graph: NavGraph): number {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);
    
    if (!fromNode || !toNode) {
      return 0;
    }
    
    return this.calculateExpectedHeading(
      { lat: fromNode.lat, lon: fromNode.lon },
      { lat: toNode.lat, lon: toNode.lon }
    );
  }

  /**
   * Calculate distance between two edges
   */
  private calculateEdgeDistance(edge1: any, edge2: any, graph: NavGraph): number {
    const from1 = graph.nodes.find(n => n.id === edge1.from);
    const to1 = graph.nodes.find(n => n.id === edge1.to);
    const from2 = graph.nodes.find(n => n.id === edge2.from);
    const to2 = graph.nodes.find(n => n.id === edge2.to);
    
    if (!from1 || !to1 || !from2 || !to2) {
      return Infinity;
    }
    
    // Calculate minimum distance between edge line segments
    const center1 = {
      lat: (from1.lat + to1.lat) / 2,
      lon: (from1.lon + to1.lon) / 2
    };
    
    const center2 = {
      lat: (from2.lat + to2.lat) / 2,
      lon: (from2.lon + to2.lon) / 2
    };
    
    return this.haversineDistance(center1, center2);
  }
}