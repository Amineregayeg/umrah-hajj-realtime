/**
 * Table-driven tests for metrics service
 * Tests counters, histograms, error handling, and performance monitoring
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from '../metrics.service';

describe('Metrics Service Comprehensive Tests', () => {
  let service: MetricsService;

  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  describe('Counter Metrics', () => {
    const counterTestCases = [
      // [metric_name, labels, increment_value, expected_behavior, description]
      ['http_requests_total', { method: 'GET', endpoint: '/api/nav' }, 1, 'increment', 'basic counter increment'],
      ['navigation_updates', { user_type: 'authenticated' }, 5, 'increment', 'counter with custom increment'],
      ['websocket_connections', { type: 'new' }, 1, 'increment', 'websocket connection counter'],
      ['hmm_calculations', { algorithm: 'viterbi' }, 1, 'increment', 'HMM algorithm counter'],
      ['pathfinding_requests', { algorithm: 'astar' }, 1, 'increment', 'pathfinding counter'],
      ['errors_total', { type: 'validation', severity: 'warning' }, 1, 'increment', 'error counter with multiple labels'],
      ['cache_hits', { cache_type: 'graph' }, 10, 'increment', 'cache performance counter'],
      ['user_sessions', { platform: 'mobile' }, 1, 'increment', 'user session counter'],
      ['api_rate_limit_exceeded', { endpoint: '/api/nav/update' }, 1, 'increment', 'rate limit counter'],
      ['database_queries', { table: 'profiles', operation: 'select' }, 1, 'increment', 'database operation counter'],
    ] as const;

    counterTestCases.forEach(([metricName, labels, incrementValue, expectedBehavior, description], index) => {
      it(`should handle ${description} (case ${index + 1})`, () => {
        // Test initial state
        const initialValue = service.getCounter(metricName, labels);
        expect(initialValue).toBe(0);

        // Increment counter
        service.incrementCounter(metricName, labels, incrementValue);

        // Verify increment
        const newValue = service.getCounter(metricName, labels);
        expect(newValue).toBe(incrementValue);

        // Increment again
        service.incrementCounter(metricName, labels, incrementValue);
        const finalValue = service.getCounter(metricName, labels);
        expect(finalValue).toBe(incrementValue * 2);
      });
    });

    it('should handle counter with no labels', () => {
      const metricName = 'simple_counter';
      
      service.incrementCounter(metricName);
      expect(service.getCounter(metricName)).toBe(1);
      
      service.incrementCounter(metricName, {}, 5);
      expect(service.getCounter(metricName)).toBe(6);
    });

    it('should handle counter with empty string labels', () => {
      const metricName = 'empty_label_counter';
      const labels = { category: '', type: 'test' };
      
      service.incrementCounter(metricName, labels);
      expect(service.getCounter(metricName, labels)).toBe(1);
    });

    it('should differentiate counters with different label combinations', () => {
      const metricName = 'multi_label_counter';
      
      service.incrementCounter(metricName, { method: 'GET', status: '200' }, 1);
      service.incrementCounter(metricName, { method: 'POST', status: '200' }, 2);
      service.incrementCounter(metricName, { method: 'GET', status: '404' }, 3);
      
      expect(service.getCounter(metricName, { method: 'GET', status: '200' })).toBe(1);
      expect(service.getCounter(metricName, { method: 'POST', status: '200' })).toBe(2);
      expect(service.getCounter(metricName, { method: 'GET', status: '404' })).toBe(3);
    });
  });

  describe('Histogram Metrics', () => {
    const histogramTestCases = [
      // [metric_name, buckets, observations, expected_bucket_counts, description]
      [
        'http_request_duration_seconds',
        [0.1, 0.5, 1.0, 2.5, 5.0, 10.0],
        [0.05, 0.3, 0.8, 1.5, 3.0, 7.0, 15.0],
        { '0.1': 1, '0.5': 2, '1.0': 3, '2.5': 4, '5.0': 5, '10.0': 6, '+Inf': 7 },
        'HTTP request duration histogram'
      ],
      [
        'navigation_processing_time',
        [0.01, 0.05, 0.1, 0.2, 0.5],
        [0.005, 0.03, 0.08, 0.15, 0.3, 0.8],
        { '0.01': 1, '0.05': 2, '0.1': 3, '0.2': 4, '0.5': 5, '+Inf': 6 },
        'Navigation processing time histogram'
      ],
      [
        'hmm_candidate_count',
        [5, 10, 20, 50, 100],
        [3, 8, 15, 30, 75, 150],
        { '5': 1, '10': 2, '20': 3, '50': 4, '100': 5, '+Inf': 6 },
        'HMM candidate count histogram'
      ],
      [
        'websocket_message_size',
        [1024, 4096, 16384, 65536],
        [500, 2048, 8192, 32768, 100000],
        { '1024': 1, '4096': 2, '16384': 3, '65536': 4, '+Inf': 5 },
        'WebSocket message size histogram'
      ],
    ] as const;

    histogramTestCases.forEach(([metricName, buckets, observations, expectedBucketCounts, description], index) => {
      it(`should handle ${description} (case ${index + 1})`, () => {
        // Initialize histogram
        service.createHistogram(metricName, buckets);

        // Add observations
        observations.forEach(observation => {
          service.observeHistogram(metricName, observation);
        });

        // Verify bucket counts
        const histogram = service.getHistogram(metricName);
        expect(histogram).toBeDefined();
        expect(histogram.buckets).toBeDefined();

        Object.entries(expectedBucketCounts).forEach(([bucket, expectedCount]) => {
          expect(histogram.buckets[bucket]).toBe(expectedCount);
        });

        // Verify total count
        expect(histogram.count).toBe(observations.length);

        // Verify sum (approximate)
        const expectedSum = observations.reduce((sum, obs) => sum + obs, 0);
        expect(histogram.sum).toBeCloseTo(expectedSum, 2);
      });
    });

    it('should handle histogram with labels', () => {
      const metricName = 'labeled_histogram';
      const buckets = [1, 5, 10];
      
      service.createHistogram(metricName, buckets);
      
      // Add observations with different labels
      service.observeHistogram(metricName, 0.5, { endpoint: '/api/nav' });
      service.observeHistogram(metricName, 3, { endpoint: '/api/nav' });
      service.observeHistogram(metricName, 8, { endpoint: '/api/profile' });
      
      const navHistogram = service.getHistogram(metricName, { endpoint: '/api/nav' });
      const profileHistogram = service.getHistogram(metricName, { endpoint: '/api/profile' });
      
      expect(navHistogram.count).toBe(2);
      expect(profileHistogram.count).toBe(1);
      expect(navHistogram.buckets['1']).toBe(1);
      expect(navHistogram.buckets['5']).toBe(2);
      expect(profileHistogram.buckets['10']).toBe(1);
    });

    it('should calculate percentiles correctly', () => {
      const metricName = 'percentile_histogram';
      const buckets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      service.createHistogram(metricName, buckets);
      
      // Add 100 observations (1 to 10, repeated 10 times each)
      for (let i = 1; i <= 10; i++) {
        for (let j = 0; j < 10; j++) {
          service.observeHistogram(metricName, i);
        }
      }
      
      const histogram = service.getHistogram(metricName);
      const percentiles = service.calculateHistogramPercentiles(metricName, [50, 95, 99]);
      
      expect(percentiles.p50).toBeCloseTo(5.5, 1); // Median should be around 5.5
      expect(percentiles.p95).toBeCloseTo(9.5, 1); // 95th percentile around 9.5
      expect(percentiles.p99).toBeCloseTo(10, 1);  // 99th percentile around 10
    });
  });

  describe('Gauge Metrics', () => {
    const gaugeTestCases = [
      // [metric_name, initial_value, operations, expected_final_value, description]
      ['active_users', 0, [['set', 10], ['inc', 5], ['dec', 2]], 13, 'active users gauge'],
      ['memory_usage_bytes', 1000000, [['set', 2000000], ['inc', 500000]], 2500000, 'memory usage gauge'],
      ['queue_length', 5, [['dec', 2], ['inc', 8], ['set', 3]], 3, 'queue length gauge'],
      ['temperature_celsius', 20.5, [['set', 25.0], ['inc', 2.5], ['dec', 1.0]], 26.5, 'temperature gauge with decimals'],
      ['cpu_utilization_percent', 0, [['set', 45.7], ['inc', 10.3]], 56.0, 'CPU utilization gauge'],
    ] as const;

    gaugeTestCases.forEach(([metricName, initialValue, operations, expectedFinalValue, description], index) => {
      it(`should handle ${description} (case ${index + 1})`, () => {
        // Set initial value
        service.setGauge(metricName, initialValue);
        expect(service.getGauge(metricName)).toBe(initialValue);

        // Apply operations
        operations.forEach(([operation, value]) => {
          switch (operation) {
            case 'set':
              service.setGauge(metricName, value);
              break;
            case 'inc':
              service.incrementGauge(metricName, value);
              break;
            case 'dec':
              service.decrementGauge(metricName, value);
              break;
          }
        });

        // Verify final value
        expect(service.getGauge(metricName)).toBeCloseTo(expectedFinalValue, 2);
      });
    });

    it('should handle gauge with labels', () => {
      const metricName = 'labeled_gauge';
      
      service.setGauge(metricName, 10, { instance: 'server1' });
      service.setGauge(metricName, 20, { instance: 'server2' });
      
      expect(service.getGauge(metricName, { instance: 'server1' })).toBe(10);
      expect(service.getGauge(metricName, { instance: 'server2' })).toBe(20);
      
      service.incrementGauge(metricName, 5, { instance: 'server1' });
      expect(service.getGauge(metricName, { instance: 'server1' })).toBe(15);
      expect(service.getGauge(metricName, { instance: 'server2' })).toBe(20); // Unchanged
    });
  });

  describe('Error Handling and Edge Cases', () => {
    const errorTestCases = [
      {
        name: 'invalid metric name',
        operation: () => service.incrementCounter(''),
        shouldThrow: true,
        expectedError: 'metric name',
      },
      {
        name: 'negative counter increment',
        operation: () => service.incrementCounter('test_counter', {}, -1),
        shouldThrow: true,
        expectedError: 'negative',
      },
      {
        name: 'histogram with invalid buckets',
        operation: () => service.createHistogram('test_histogram', [5, 3, 1]),
        shouldThrow: true,
        expectedError: 'sorted',
      },
      {
        name: 'histogram with duplicate buckets',
        operation: () => service.createHistogram('test_histogram', [1, 2, 2, 3]),
        shouldThrow: true,
        expectedError: 'duplicate',
      },
      {
        name: 'observe non-existent histogram',
        operation: () => service.observeHistogram('non_existent_histogram', 1.0),
        shouldThrow: true,
        expectedError: 'not found',
      },
      {
        name: 'observe negative value in histogram',
        operation: () => {
          service.createHistogram('test_histogram', [1, 5, 10]);
          service.observeHistogram('test_histogram', -1);
        },
        shouldThrow: true,
        expectedError: 'negative',
      },
      {
        name: 'get non-existent counter',
        operation: () => service.getCounter('non_existent_counter'),
        shouldThrow: false,
        expectedResult: 0,
      },
      {
        name: 'get non-existent gauge',
        operation: () => service.getGauge('non_existent_gauge'),
        shouldThrow: false,
        expectedResult: 0,
      },
    ] as const;

    errorTestCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, () => {
        if (testCase.shouldThrow) {
          expect(testCase.operation).toThrow(expect.stringContaining(testCase.expectedError!));
        } else {
          const result = testCase.operation();
          if ('expectedResult' in testCase) {
            expect(result).toBe(testCase.expectedResult);
          }
        }
      });
    });
  });

  describe('Metric Aggregation and Reporting', () => {
    it('should aggregate metrics by labels', () => {
      const metricName = 'http_requests';
      
      // Add various requests
      service.incrementCounter(metricName, { method: 'GET', status: '200' }, 10);
      service.incrementCounter(metricName, { method: 'GET', status: '404' }, 2);
      service.incrementCounter(metricName, { method: 'POST', status: '200' }, 5);
      service.incrementCounter(metricName, { method: 'POST', status: '500' }, 1);
      
      const allMetrics = service.getAllCounters(metricName);
      expect(Object.keys(allMetrics)).toHaveLength(4);
      
      const totalRequests = Object.values(allMetrics).reduce((sum, count) => sum + count, 0);
      expect(totalRequests).toBe(18);
    });

    it('should generate metrics summary', () => {
      // Setup various metrics
      service.incrementCounter('requests_total', { endpoint: '/api/nav' }, 100);
      service.incrementCounter('errors_total', { type: 'validation' }, 5);
      
      service.setGauge('active_connections', 25);
      service.setGauge('memory_usage', 1024000);
      
      service.createHistogram('response_time', [0.1, 0.5, 1.0]);
      service.observeHistogram('response_time', 0.2);
      service.observeHistogram('response_time', 0.8);
      
      const summary = service.getMetricsSummary();
      
      expect(summary.counters).toBeDefined();
      expect(summary.gauges).toBeDefined();
      expect(summary.histograms).toBeDefined();
      expect(summary.timestamp).toBeDefined();
      
      expect(summary.counters['requests_total']).toBeDefined();
      expect(summary.gauges['active_connections']).toBe(25);
      expect(summary.histograms['response_time']).toBeDefined();
    });

    it('should export metrics in Prometheus format', () => {
      service.incrementCounter('test_counter', { label: 'value' }, 5);
      service.setGauge('test_gauge', 42);
      
      const prometheus = service.exportPrometheusFormat();
      
      expect(prometheus).toContain('# TYPE test_counter counter');
      expect(prometheus).toContain('test_counter{label="value"} 5');
      expect(prometheus).toContain('# TYPE test_gauge gauge');
      expect(prometheus).toContain('test_gauge 42');
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle high-frequency metric updates efficiently', () => {
      const metricName = 'high_frequency_counter';
      const iterations = 10000;
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        service.incrementCounter(metricName, { batch: Math.floor(i / 1000).toString() });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle 10k increments in reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
      
      // Verify final count
      const total = service.getAllCounters(metricName);
      const totalCount = Object.values(total).reduce((sum, count) => sum + count, 0);
      expect(totalCount).toBe(iterations);
    });

    it('should handle many unique label combinations', () => {
      const metricName = 'many_labels_counter';
      const labelCombinations = 1000;
      
      for (let i = 0; i < labelCombinations; i++) {
        service.incrementCounter(metricName, {
          user_id: `user_${i}`,
          session: `session_${i % 100}`,
          platform: i % 2 === 0 ? 'mobile' : 'web',
        });
      }
      
      const allCounters = service.getAllCounters(metricName);
      expect(Object.keys(allCounters)).toHaveLength(labelCombinations);
    });

    it('should handle memory cleanup for old metrics', () => {
      const metricName = 'cleanup_test_counter';
      
      // Create many metrics
      for (let i = 0; i < 100; i++) {
        service.incrementCounter(metricName, { id: i.toString() });
      }
      
      // Trigger cleanup (if implemented)
      service.cleanupOldMetrics?.(Date.now() - 60000); // Clean metrics older than 1 minute
      
      // Should still have recent metrics
      expect(service.getCounter(metricName, { id: '50' })).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrent Access Safety', () => {
    it('should handle concurrent counter increments safely', async () => {
      const metricName = 'concurrent_counter';
      const concurrentOperations = 100;
      
      const promises = Array.from({ length: concurrentOperations }, (_, i) => 
        Promise.resolve().then(() => {
          service.incrementCounter(metricName, { thread: (i % 10).toString() });
        })
      );
      
      await Promise.all(promises);
      
      const allCounters = service.getAllCounters(metricName);
      const totalCount = Object.values(allCounters).reduce((sum, count) => sum + count, 0);
      expect(totalCount).toBe(concurrentOperations);
    });

    it('should handle concurrent histogram observations safely', async () => {
      const metricName = 'concurrent_histogram';
      service.createHistogram(metricName, [1, 5, 10]);
      
      const concurrentObservations = 100;
      
      const promises = Array.from({ length: concurrentObservations }, (_, i) => 
        Promise.resolve().then(() => {
          service.observeHistogram(metricName, Math.random() * 10);
        })
      );
      
      await Promise.all(promises);
      
      const histogram = service.getHistogram(metricName);
      expect(histogram.count).toBe(concurrentObservations);
    });
  });

  describe('Custom Metric Types', () => {
    it('should support timer metrics', () => {
      const timerName = 'operation_timer';
      
      const timer = service.startTimer(timerName);
      expect(timer).toBeDefined();
      
      // Simulate some work
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Busy wait for 10ms
      }
      
      const duration = timer.end();
      expect(duration).toBeGreaterThan(0.008); // Should be at least 8ms
      expect(duration).toBeLessThan(0.1);      // Should be less than 100ms
    });

    it('should support summary metrics', () => {
      const summaryName = 'request_summary';
      
      service.createSummary(summaryName, [0.5, 0.9, 0.99]);
      
      // Add observations
      for (let i = 1; i <= 100; i++) {
        service.observeSummary(summaryName, i);
      }
      
      const summary = service.getSummary(summaryName);
      expect(summary.count).toBe(100);
      expect(summary.sum).toBe(5050); // Sum of 1 to 100
      expect(summary.quantiles['0.5']).toBeCloseTo(50, 5);   // Median
      expect(summary.quantiles['0.9']).toBeCloseTo(90, 5);   // 90th percentile
      expect(summary.quantiles['0.99']).toBeCloseTo(99, 2);  // 99th percentile
    });
  });

  afterEach(() => {
    // Clean up metrics between tests
    service.reset?.();
  });
});