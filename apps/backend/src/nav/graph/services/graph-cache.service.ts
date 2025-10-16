import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PathFindingResult, RouteRequest } from '../interfaces/graph.interface';

interface CacheEntry {
  result: PathFindingResult;
  timestamp: number;
  hits: number;
}

@Injectable()
export class GraphCacheService {
  private readonly logger = new Logger(GraphCacheService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly maxCacheSize: number;
  private readonly cacheTtl: number; // Time to live in milliseconds
  private readonly isDevMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.maxCacheSize = this.configService.get<number>('GRAPH_CACHE_SIZE') || 1000;
    this.cacheTtl = this.configService.get<number>('GRAPH_CACHE_TTL') || 300000; // 5 minutes
    this.isDevMode = this.configService.get<string>('NODE_ENV') !== 'production';
    
    // In development, disable cache or use shorter TTL
    if (this.isDevMode) {
      this.logger.log('Development mode: Cache TTL reduced for hot-reload compatibility');
    }
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  private generateCacheKey(request: RouteRequest): string {
    return `${request.from}:${request.to}:${request.algorithm || 'dijkstra'}:${request.avoidFloorChanges || false}`;
  }

  get(request: RouteRequest): PathFindingResult | null {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    const effectiveTtl = this.isDevMode ? Math.min(this.cacheTtl, 30000) : this.cacheTtl; // 30s in dev mode
    
    if (now - entry.timestamp > effectiveTtl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and return result
    entry.hits++;
    this.logger.debug(`Cache hit for ${key} (${entry.hits} hits)`);
    return entry.result;
  }

  set(request: RouteRequest, result: PathFindingResult): void {
    const key = this.generateCacheKey(request);
    
    // If cache is full, remove least recently used entries
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastUsed();
    }

    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      hits: 0
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cached result for ${key}`);
  }

  invalidate(pattern?: string): void {
    if (pattern) {
      // Invalidate entries matching pattern
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
      
      this.logger.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
    } else {
      // Clear entire cache
      const size = this.cache.size;
      this.cache.clear();
      this.logger.log(`Cleared entire cache (${size} entries)`);
    }
  }

  invalidateNode(nodeId: string): void {
    // Invalidate all cache entries that involve this node
    this.invalidate(nodeId);
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: now - entry.timestamp
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = Math.max(totalHits + this.cache.size, 1); // Approximate
    const hitRate = totalHits / totalRequests;

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate,
      entries: entries.sort((a, b) => b.hits - a.hits) // Sort by hits descending
    };
  }

  private evictLeastUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    let leastHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Prioritize by hits first, then by age
      if (entry.hits < leastHits || (entry.hits === leastHits && entry.timestamp < oldestTime)) {
        leastHits = entry.hits;
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted cache entry: ${oldestKey}`);
    }
  }

  private startCleanupInterval(): void {
    const cleanupInterval = this.isDevMode ? 30000 : 60000; // 30s in dev, 1min in prod
    
    const intervalId = setInterval(() => {
      this.cleanupExpiredEntries();
    }, cleanupInterval);
    
    // Unref the timer so it doesn't keep the process alive in tests
    intervalId.unref();
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const effectiveTtl = this.isDevMode ? Math.min(this.cacheTtl, 30000) : this.cacheTtl;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > effectiveTtl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  // Method to be called when graph is hot-reloaded
  onGraphReload(): void {
    this.invalidate();
    this.logger.log('Cache invalidated due to graph hot-reload');
  }
}