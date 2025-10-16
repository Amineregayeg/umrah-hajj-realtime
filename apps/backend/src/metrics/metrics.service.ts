import { Injectable, Logger } from '@nestjs/common';

// Try to import prom-client, fall back to simple implementation if not available
let promClient: any;
try {
  promClient = require('prom-client');
} catch {
  promClient = null;
}

// Define a minimal Prometheus-compatible metrics interface
interface Counter {
  inc(value?: number): void;
  labels(...labelValues: string[]): Counter;
}

interface Histogram {
  observe(value: number): void;
  labels(...labelValues: string[]): Histogram;
  startTimer(): () => void;
}

interface Gauge {
  set(value: number): void;
  inc(value?: number): void;
  dec(value?: number): void;
  labels(...labelValues: string[]): Gauge;
}

interface Registry {
  metrics(): Promise<string>;
  clear(): void;
  registerMetric(metric: any): void;
}

@Injectable()
export class MetricsService {
  private logger = new Logger('MetricsService');
  private promClient: any;
  private registry: Registry;
  
  // WebSocket metrics
  private wsActiveConnections: Gauge;
  private wsMessagesInTotal: Counter;
  private wsMessagesOutTotal: Counter;
  private wsCorrectionsTotal: Counter;
  private wsQueueDropsTotal: Counter;
  private wsReroutesTotal: Counter;
  private wsHeartbeatSentTotal: Counter;
  
  // HMM Navigation metrics
  private navHmmResetsTotal: Counter;
  private navTeleportDetectedTotal: Counter;
  private navSnapErrorMBucket: Histogram;
  private navCorrectionLatency: Histogram;
  private navPathfindingDuration: Histogram;
  
  // REST API metrics
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private httpRequestsInFlight: Gauge;
  
  // AI Token metrics
  private aiTokenIssuanceTotal: Counter;
  private aiTokenUsageTotal: Counter;
  private aiToken429Errors: Counter;
  private aiTokenLatency: Histogram;
  
  // Database metrics
  private dbConnectionsActive: Gauge;
  private dbQueryDuration: Histogram;
  private dbQueryErrors: Counter;
  
  // Process metrics
  private processMetricsCollected = false;
  private buildInfo: Gauge;
  
  // Performance counters
  private cpuUsage: Gauge;
  private memoryUsage: Gauge;
  private eventLoopLag: Histogram;

  constructor() {
    this.initializeMetrics();
    this.collectProcessMetrics();
  }

  private async initializeMetrics() {
    if (promClient) {
      this.logger.log('Initializing Prometheus metrics with prom-client');
      this.promClient = promClient;
      this.registry = new promClient.Registry();
      this.createMetrics();
      // Collect default metrics
      promClient.collectDefaultMetrics({ register: this.registry });
    } else {
      this.logger.warn('prom-client not available, using simple metrics implementation');
      this.createSimpleMetrics();
    }
  }

  private createMetrics() {
    if (!this.promClient) return;

    // WebSocket connection metrics
    this.wsActiveConnections = new this.promClient.Gauge({
      name: 'ws_active_connections',
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });

    this.wsMessagesInTotal = new this.promClient.Counter({
      name: 'ws_messages_in_total',
      help: 'Total number of WebSocket messages received',
      labelNames: ['event_type', 'user_id'],
      registers: [this.registry],
    });

    this.wsMessagesOutTotal = new this.promClient.Counter({
      name: 'ws_messages_out_total',
      help: 'Total number of WebSocket messages sent',
      labelNames: ['event_type', 'priority'],
      registers: [this.registry],
    });

    this.wsCorrectionsTotal = new this.promClient.Counter({
      name: 'ws_corrections_total',
      help: 'Total number of navigation corrections sent',
      labelNames: ['user_id'],
      registers: [this.registry],
    });

    this.wsQueueDropsTotal = new this.promClient.Counter({
      name: 'ws_queue_drops_total',
      help: 'Total number of WebSocket messages dropped due to queue overflow',
      labelNames: ['user_id', 'priority'],
      registers: [this.registry],
    });

    this.wsReroutesTotal = new this.promClient.Counter({
      name: 'ws_reroutes_total',
      help: 'Total number of navigation reroutes processed',
      labelNames: ['user_id'],
      registers: [this.registry],
    });

    this.wsHeartbeatSentTotal = new this.promClient.Counter({
      name: 'ws_heartbeat_sent_total',
      help: 'Total number of WebSocket heartbeat messages sent',
      labelNames: ['user_id'],
      registers: [this.registry],
    });

    // HMM Navigation metrics
    this.navHmmResetsTotal = new this.promClient.Counter({
      name: 'nav_hmm_resets_total',
      help: 'Total number of HMM tracker resets (due to reroutes or teleports)',
      labelNames: ['user_id'],
      registers: [this.registry],
    });

    this.navTeleportDetectedTotal = new this.promClient.Counter({
      name: 'nav_teleport_detected_total',
      help: 'Total number of teleport events detected by HMM tracker',
      labelNames: ['user_id'],
      registers: [this.registry],
    });

    this.navSnapErrorMBucket = new this.promClient.Histogram({
      name: 'nav_snap_error_m_bucket',
      help: 'Distribution of snap errors in meters between GPS and corrected position',
      labelNames: ['user_id'],
      buckets: [0.5, 1.0, 2.0, 3.0, 5.0, 8.0, 10.0, 15.0, 20.0, 30.0, 50.0],
      registers: [this.registry],
    });

    // REST API metrics
    this.httpRequestsTotal = new this.promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new this.promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.registry],
    });

    this.httpRequestsInFlight = new this.promClient.Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });

    // Navigation performance metrics
    this.navCorrectionLatency = new this.promClient.Histogram({
      name: 'nav_correction_latency_seconds',
      help: 'Time taken to calculate navigation corrections',
      labelNames: ['user_id', 'correction_type'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
      registers: [this.registry],
    });

    this.navPathfindingDuration = new this.promClient.Histogram({
      name: 'nav_pathfinding_duration_seconds',
      help: 'Time taken for pathfinding calculations',
      labelNames: ['algorithm', 'from_floor', 'to_floor'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0],
      registers: [this.registry],
    });

    // AI Token metrics
    this.aiTokenIssuanceTotal = new this.promClient.Counter({
      name: 'ai_token_issuance_total',
      help: 'Total number of AI tokens issued',
      labelNames: ['user_id', 'token_type'],
      registers: [this.registry],
    });

    this.aiTokenUsageTotal = new this.promClient.Counter({
      name: 'ai_token_usage_total',
      help: 'Total number of AI tokens consumed',
      labelNames: ['user_id', 'service', 'model'],
      registers: [this.registry],
    });

    this.aiToken429Errors = new this.promClient.Counter({
      name: 'ai_token_rate_limit_errors_total',
      help: 'Total number of AI token rate limit errors (429)',
      labelNames: ['user_id', 'service'],
      registers: [this.registry],
    });

    this.aiTokenLatency = new this.promClient.Histogram({
      name: 'ai_token_request_duration_seconds',
      help: 'Duration of AI token requests',
      labelNames: ['service', 'operation'],
      buckets: [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
      registers: [this.registry],
    });

    // Database metrics
    this.dbConnectionsActive = new this.promClient.Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    this.dbQueryDuration = new this.promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
      registers: [this.registry],
    });

    this.dbQueryErrors = new this.promClient.Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table', 'error_type'],
      registers: [this.registry],
    });

    // Build info
    this.buildInfo = new this.promClient.Gauge({
      name: 'build_info',
      help: 'Build information',
      labelNames: ['version', 'git_sha', 'build_date'],
      registers: [this.registry],
    });

    // Performance counters
    this.cpuUsage = new this.promClient.Gauge({
      name: 'process_cpu_usage_percent',
      help: 'Current CPU usage percentage',
      registers: [this.registry],
    });

    this.memoryUsage = new this.promClient.Gauge({
      name: 'process_memory_usage_bytes',
      help: 'Current memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.eventLoopLag = new this.promClient.Histogram({
      name: 'nodejs_eventloop_lag_seconds',
      help: 'Lag of event loop in seconds',
      buckets: [0.001, 0.01, 0.1, 1.0],
      registers: [this.registry],
    });
  }

  private createSimpleMetrics() {
    // Create simple in-memory metrics store
    const metricsStore = {
      wsActiveConnections: 0,
      wsMessagesInTotal: 0,
      wsMessagesOutTotal: 0,
      wsCorrectionsTotal: 0,
      wsQueueDropsTotal: 0,
      wsReroutesTotal: 0,
      wsHeartbeatSentTotal: 0,
      httpRequestsTotal: 0,
      navHmmResetsTotal: 0,
      navTeleportDetectedTotal: 0,
      navSnapErrorCount: 0,
      navSnapErrorSum: 0,
    };

    const simpleCounter = (metricName: keyof typeof metricsStore) => ({
      inc: (value = 1) => {
        metricsStore[metricName] += value;
      },
      labels: (...labelValues: string[]) => ({
        inc: (value = 1) => {
          metricsStore[metricName] += value;
        },
        labels: (...labelValues: string[]) => ({
          inc: (value = 1) => {
            metricsStore[metricName] += value;
          }
        }) as any
      })
    });

    const simpleGauge = (metricName: keyof typeof metricsStore) => ({
      set: (value: number) => {
        metricsStore[metricName] = value;
      },
      inc: (value = 1) => {
        metricsStore[metricName] += value;
      },
      dec: (value = 1) => {
        metricsStore[metricName] -= value;
      },
      labels: (...labelValues: string[]) => ({
        set: (value: number) => {
          metricsStore[metricName] = value;
        },
        inc: (value = 1) => {
          metricsStore[metricName] += value;
        },
        dec: (value = 1) => {
          metricsStore[metricName] -= value;
        }
      }) as any
    });

    const simpleHistogram = {
      observe: () => {},
      labels: (...labelValues: string[]) => ({
        observe: () => {},
        labels: (...labelValues: string[]) => simpleHistogram,
        startTimer: () => () => {},
      }),
      startTimer: () => () => {},
    };

    this.wsActiveConnections = simpleGauge('wsActiveConnections');
    this.wsMessagesInTotal = simpleCounter('wsMessagesInTotal');
    this.wsMessagesOutTotal = simpleCounter('wsMessagesOutTotal');
    this.wsCorrectionsTotal = simpleCounter('wsCorrectionsTotal');
    this.wsQueueDropsTotal = simpleCounter('wsQueueDropsTotal');
    this.wsReroutesTotal = simpleCounter('wsReroutesTotal');
    this.wsHeartbeatSentTotal = simpleCounter('wsHeartbeatSentTotal');
    this.httpRequestsTotal = simpleCounter('httpRequestsTotal');
    this.httpRequestDuration = simpleHistogram;
    
    // HMM Navigation metrics
    this.navHmmResetsTotal = simpleCounter('navHmmResetsTotal');
    this.navTeleportDetectedTotal = simpleCounter('navTeleportDetectedTotal');
    this.navSnapErrorMBucket = {
      observe: (value: number) => {
        metricsStore.navSnapErrorCount++;
        metricsStore.navSnapErrorSum += value;
      },
      labels: (...labelValues: string[]) => ({
        observe: (value: number) => {
          metricsStore.navSnapErrorCount++;
          metricsStore.navSnapErrorSum += value;
        },
        labels: (...labelValues: string[]) => this.navSnapErrorMBucket,
        startTimer: () => () => {},
      }),
      startTimer: () => () => {},
    };

    this.registry = {
      metrics: async () => this.formatSimpleMetrics(metricsStore),
      clear: () => {
        Object.keys(metricsStore).forEach(key => {
          metricsStore[key as keyof typeof metricsStore] = 0;
        });
      },
      registerMetric: () => {},
    };
  }

  private formatSimpleMetrics(metricsStore: any): string {
    const timestamp = Date.now();
    
    let output = `# Umrah Hajj Backend Metrics (Generated at ${new Date().toISOString()})\n`;
    output += `# HELP ws_active_connections Number of active WebSocket connections\n`;
    output += `# TYPE ws_active_connections gauge\n`;
    output += `ws_active_connections ${metricsStore.wsActiveConnections} ${timestamp}\n\n`;
    
    output += `# HELP ws_messages_in_total Total number of WebSocket messages received\n`;
    output += `# TYPE ws_messages_in_total counter\n`;
    output += `ws_messages_in_total ${metricsStore.wsMessagesInTotal} ${timestamp}\n\n`;
    
    output += `# HELP ws_messages_out_total Total number of WebSocket messages sent\n`;
    output += `# TYPE ws_messages_out_total counter\n`;
    output += `ws_messages_out_total ${metricsStore.wsMessagesOutTotal} ${timestamp}\n\n`;
    
    output += `# HELP ws_corrections_total Total number of navigation corrections sent\n`;
    output += `# TYPE ws_corrections_total counter\n`;
    output += `ws_corrections_total ${metricsStore.wsCorrectionsTotal} ${timestamp}\n\n`;
    
    output += `# HELP ws_queue_drops_total Total number of WebSocket messages dropped due to queue overflow\n`;
    output += `# TYPE ws_queue_drops_total counter\n`;
    output += `ws_queue_drops_total ${metricsStore.wsQueueDropsTotal} ${timestamp}\n\n`;
    
    output += `# HELP ws_reroutes_total Total number of navigation reroutes processed\n`;
    output += `# TYPE ws_reroutes_total counter\n`;
    output += `ws_reroutes_total ${metricsStore.wsReroutesTotal} ${timestamp}\n\n`;
    
    output += `# HELP ws_heartbeat_sent_total Total number of WebSocket heartbeat messages sent\n`;
    output += `# TYPE ws_heartbeat_sent_total counter\n`;
    output += `ws_heartbeat_sent_total ${metricsStore.wsHeartbeatSentTotal} ${timestamp}\n\n`;
    
    output += `# HELP http_requests_total Total number of HTTP requests\n`;
    output += `# TYPE http_requests_total counter\n`;
    output += `http_requests_total ${metricsStore.httpRequestsTotal} ${timestamp}\n\n`;
    
    // HMM Navigation metrics
    output += `# HELP nav_hmm_resets_total Total number of HMM tracker resets\n`;
    output += `# TYPE nav_hmm_resets_total counter\n`;
    output += `nav_hmm_resets_total ${metricsStore.navHmmResetsTotal} ${timestamp}\n\n`;
    
    output += `# HELP nav_teleport_detected_total Total number of teleport events detected\n`;
    output += `# TYPE nav_teleport_detected_total counter\n`;
    output += `nav_teleport_detected_total ${metricsStore.navTeleportDetectedTotal} ${timestamp}\n\n`;
    
    output += `# HELP nav_snap_error_m_bucket Distribution of snap errors in meters\n`;
    output += `# TYPE nav_snap_error_m_bucket histogram\n`;
    const avgSnapError = metricsStore.navSnapErrorCount > 0 ? 
      (metricsStore.navSnapErrorSum / metricsStore.navSnapErrorCount).toFixed(2) : '0.00';
    output += `nav_snap_error_m_bucket_count ${metricsStore.navSnapErrorCount} ${timestamp}\n`;
    output += `nav_snap_error_m_bucket_sum ${metricsStore.navSnapErrorSum.toFixed(2)} ${timestamp}\n`;
    output += `nav_snap_error_m_bucket_avg ${avgSnapError} ${timestamp}\n\n`;
    
    // Add basic process metrics placeholder
    output += `# HELP process_start_time_seconds Start time of the process since unix epoch in seconds\n`;
    output += `# TYPE process_start_time_seconds gauge\n`;
    output += `process_start_time_seconds ${Math.floor(Date.now() / 1000 - process.uptime())} ${timestamp}\n\n`;
    
    output += `# HELP nodejs_version_info Node.js version info\n`;
    output += `# TYPE nodejs_version_info gauge\n`;
    output += `nodejs_version_info{version="${process.version}"} 1 ${timestamp}\n\n`;
    
    return output;
  }

  private collectProcessMetrics() {
    if (!this.promClient) return;

    // Set build info (will be enhanced by build_info endpoint)
    const packageJson = require('../../package.json');
    this.buildInfo.labels(
      packageJson.version || '0.0.1',
      process.env.GIT_SHA || 'unknown',
      process.env.BUILD_DATE || new Date().toISOString()
    ).set(1);

    // Collect performance metrics every 30 seconds
    setInterval(() => {
      try {
        // CPU usage
        const cpuUsage = process.cpuUsage();
        this.cpuUsage.set((cpuUsage.user + cpuUsage.system) / 1000000); // Convert to seconds

        // Memory usage
        const memUsage = process.memoryUsage();
        this.memoryUsage.labels('rss').set(memUsage.rss);
        this.memoryUsage.labels('heapTotal').set(memUsage.heapTotal);
        this.memoryUsage.labels('heapUsed').set(memUsage.heapUsed);
        this.memoryUsage.labels('external').set(memUsage.external);

        // Event loop lag
        const start = process.hrtime.bigint();
        setImmediate(() => {
          const lag = Number(process.hrtime.bigint() - start) / 1e9;
          this.eventLoopLag.observe(lag);
        });
      } catch (error) {
        this.logger.error('Error collecting process metrics:', error);
      }
    }, 30000);

    this.processMetricsCollected = true;
  }

  // WebSocket metrics methods
  incrementActiveConnections() {
    this.wsActiveConnections.inc();
  }

  decrementActiveConnections() {
    this.wsActiveConnections.dec();
  }

  incrementMessageIn(eventType: string, userId?: string) {
    this.wsMessagesInTotal.labels(eventType, userId || 'unknown').inc();
  }

  incrementMessageOut(eventType: string, priority: string = 'medium') {
    this.wsMessagesOutTotal.labels(eventType, priority).inc();
  }

  incrementCorrections(userId: string) {
    this.wsCorrectionsTotal.labels(userId).inc();
  }

  incrementQueueDrops(userId: string, priority: string) {
    this.wsQueueDropsTotal.labels(userId, priority).inc();
  }

  incrementHeartbeatSent(userId: string) {
    this.wsHeartbeatSentTotal.labels(userId).inc();
  }

  // HMM Navigation metrics methods
  incrementHmmResets(userId: string) {
    this.navHmmResetsTotal.labels(userId).inc();
  }

  incrementTeleportDetected(userId: string) {
    this.navTeleportDetectedTotal.labels(userId).inc();
  }

  observeSnapError(userId: string, errorMeters: number) {
    this.navSnapErrorMBucket.labels(userId).observe(errorMeters);
  }

  // Enhanced metric methods for realtime integration
  incrementReroutes(userId: string) {
    this.wsReroutesTotal.labels(userId).inc();
  }

  // Navigation performance metrics
  observeCorrectionLatency(userId: string, correctionType: string, duration: number) {
    this.navCorrectionLatency?.labels(userId, correctionType).observe(duration);
  }

  observePathfindingDuration(algorithm: string, fromFloor: string, toFloor: string, duration: number) {
    this.navPathfindingDuration?.labels(algorithm, fromFloor, toFloor).observe(duration);
  }

  // AI Token metrics
  incrementTokenIssuance(userId: string, tokenType: string) {
    this.aiTokenIssuanceTotal?.labels(userId, tokenType).inc();
  }

  incrementTokenUsage(userId: string, service: string, model: string) {
    this.aiTokenUsageTotal?.labels(userId, service, model).inc();
  }

  increment429Errors(userId: string, service: string) {
    this.aiToken429Errors?.labels(userId, service).inc();
  }

  observeTokenLatency(service: string, operation: string, duration: number) {
    this.aiTokenLatency?.labels(service, operation).observe(duration);
  }

  // Database metrics
  setActiveConnections(count: number) {
    this.dbConnectionsActive?.set(count);
  }

  observeQueryDuration(operation: string, table: string, duration: number) {
    this.dbQueryDuration?.labels(operation, table).observe(duration);
  }

  incrementQueryErrors(operation: string, table: string, errorType: string) {
    this.dbQueryErrors?.labels(operation, table, errorType).inc();
  }

  // HTTP in-flight tracking
  incrementHttpInFlight(method: string, route: string) {
    this.httpRequestsInFlight?.labels(method, route).inc();
  }

  decrementHttpInFlight(method: string, route: string) {
    this.httpRequestsInFlight?.labels(method, route).dec();
  }

  // Batch observe snap errors for performance
  observeSnapErrorBatch(measurements: Array<{ userId: string; errorMeters: number }>) {
    measurements.forEach(({ userId, errorMeters }) => {
      this.navSnapErrorMBucket.labels(userId).observe(errorMeters);
    });
  }

  // REST API metrics methods
  incrementHttpRequest(method: string, route: string, statusCode: number) {
    this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
  }

  observeHttpDuration(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
  }

  startHttpTimer(method: string, route: string, statusCode: number) {
    return this.httpRequestDuration.labels(method, route, statusCode.toString()).startTimer();
  }

  // Get metrics in Prometheus format
  async getMetrics(): Promise<string> {
    try {
      return await this.registry.metrics();
    } catch (error) {
      this.logger.error('Error getting metrics:', error);
      return '# Error retrieving metrics\n';
    }
  }

  // Get metrics summary for debugging
  getMetricsSummary() {
    return {
      processMetricsCollected: this.processMetricsCollected,
      promClientAvailable: !!this.promClient,
      registrySize: this.registry ? Object.keys(this.registry).length : 0,
      timestamp: new Date().toISOString(),
      metrics: {
        websocket: {
          activeConnections: true,
          messageCounters: true,
          queueDrops: true,
          heartbeats: true
        },
        navigation: {
          hmmTracking: true,
          snapErrors: true,
          correctionLatency: !!this.navCorrectionLatency,
          pathfindingDuration: !!this.navPathfindingDuration
        },
        http: {
          requestCounters: true,
          duration: true,
          inFlight: !!this.httpRequestsInFlight
        },
        aiTokens: {
          issuance: !!this.aiTokenIssuanceTotal,
          usage: !!this.aiTokenUsageTotal,
          rateLimits: !!this.aiToken429Errors,
          latency: !!this.aiTokenLatency
        },
        database: {
          connections: !!this.dbConnectionsActive,
          queryDuration: !!this.dbQueryDuration,
          queryErrors: !!this.dbQueryErrors
        },
        performance: {
          cpu: !!this.cpuUsage,
          memory: !!this.memoryUsage,
          eventLoop: !!this.eventLoopLag
        }
      }
    };
  }
  
  // Helper method to get build information
  getBuildInfo() {
    const packageJson = require('../../package.json');
    return {
      version: packageJson.version || '0.0.1',
      gitSha: process.env.GIT_SHA || 'unknown',
      buildDate: process.env.BUILD_DATE || new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // Method to update build info at runtime
  updateBuildInfo(version?: string, gitSha?: string, buildDate?: string) {
    if (this.buildInfo) {
      this.buildInfo.labels(
        version || this.getBuildInfo().version,
        gitSha || this.getBuildInfo().gitSha,
        buildDate || this.getBuildInfo().buildDate
      ).set(1);
    }
  }
}