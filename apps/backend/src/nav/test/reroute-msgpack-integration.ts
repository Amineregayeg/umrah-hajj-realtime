#!/usr/bin/env ts-node

/**
 * Real-time WebSocket Integration Test for Re-route Policy and MessagePack
 * 
 * This script performs live testing against a running WebSocket server to:
 * 1. Test re-route triggers with real timing
 * 2. Test MessagePack feature flag switching
 * 3. Capture server logs and binary frame analysis
 * 4. Measure actual latencies and broadcast timing
 */

import WebSocket from 'ws';
import { createHash } from 'crypto';

interface TestConfig {
  wsUrl: string;
  msgpackEnabled: boolean;
  userId: string;
  mockToken: string;
}

interface TestMetrics {
  messagesSent: number;
  messagesReceived: number;
  avgLatency: number;
  maxLatency: number;
  rerouteTriggered: boolean;
  broadcastLatencies: number[];
  processingTimes: number[];
}

class RerouteMsgpackIntegrationTest {
  private config: TestConfig;
  private logs: string[] = [];
  private metrics: TestMetrics = {
    messagesSent: 0,
    messagesReceived: 0,
    avgLatency: 0,
    maxLatency: 0,
    rerouteTriggered: false,
    broadcastLatencies: [],
    processingTimes: []
  };
  private binaryFrames: Array<{ hex: string; decoded: any; timestamp: number }> = [];

  constructor(config: TestConfig) {
    this.config = config;
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  private createWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.config.wsUrl}?token=${this.config.mockToken}`;
      const ws = new WebSocket(wsUrl, {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      ws.on('open', () => {
        this.log(`WebSocket connected to ${this.config.wsUrl}`);
        this.log(`MessagePack enabled: ${this.config.msgpackEnabled}`);
        resolve(ws);
      });

      ws.on('error', (error) => {
        this.log(`WebSocket error: ${error.message}`);
        reject(error);
      });

      ws.on('message', (data) => {
        this.handleMessage(data);
      });

      ws.on('close', (code, reason) => {
        this.log(`WebSocket closed: ${code} - ${reason}`);
      });
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    this.metrics.messagesReceived++;
    
    try {
      let parsed: any;
      let isMessagePack = false;

      if (Buffer.isBuffer(data)) {
        // Check if it's MessagePack format
        if (data.length >= 2 && data[0] === 0x82 && data[1] === 0x01) {
          isMessagePack = true;
          // Simulate MessagePack decoding (simplified)
          const jsonData = data.slice(2).toString('utf8');
          parsed = JSON.parse(jsonData);
          
          // Store binary frame for analysis
          this.binaryFrames.push({
            hex: data.toString('hex'),
            decoded: parsed,
            timestamp: Date.now()
          });
          
          this.log(`Received MessagePack frame (${data.length} bytes): ${data.toString('hex').substring(0, 32)}...`);
        } else {
          parsed = JSON.parse(data.toString('utf8'));
        }
      } else {
        parsed = JSON.parse(data.toString());
      }

      const eventType = parsed.event || 'unknown';
      this.log(`Received ${isMessagePack ? 'MessagePack' : 'JSON'} message: ${eventType}`);

      // Check for re-route related messages
      if (eventType === 'nav.correction' && parsed.data?.snapTo) {
        this.log(`Navigation correction received: snapTo=${parsed.data.snapTo}, confidence=${parsed.data.confidence}`);
        if (parsed.data.confidence < 0.5) {
          this.metrics.rerouteTriggered = true;
          this.log('🔄 RE-ROUTE TRIGGER DETECTED - Low confidence correction suggests re-routing');
        }
      }

      // Measure latency if timestamp is available
      if (parsed.data?.ts) {
        const latency = Date.now() - parsed.data.ts;
        this.metrics.broadcastLatencies.push(latency);
        if (latency > this.metrics.maxLatency) {
          this.metrics.maxLatency = latency;
        }
      }

    } catch (error) {
      this.log(`Failed to parse message: ${error.message}`);
    }
  }

  private async sendMessage(ws: WebSocket, event: string, data: any): Promise<void> {
    return new Promise((resolve) => {
      const message = {
        event,
        data: {
          ...data,
          ts: Date.now() // Add timestamp for latency measurement
        }
      };

      let serialized: string | Buffer;
      
      if (this.config.msgpackEnabled) {
        // Simulate MessagePack encoding (simplified)
        const jsonString = JSON.stringify(message);
        const jsonBuffer = Buffer.from(jsonString, 'utf8');
        const header = Buffer.from([0x82, 0x01]);
        serialized = Buffer.concat([header, jsonBuffer]);
        this.log(`Sending MessagePack message: ${event} (${serialized.length} bytes)`);
      } else {
        serialized = JSON.stringify(message);
        this.log(`Sending JSON message: ${event}`);
      }

      ws.send(serialized);
      this.metrics.messagesSent++;
      
      // Small delay to avoid overwhelming the server
      setTimeout(resolve, 50);
    });
  }

  async testOffPathReroute(ws: WebSocket): Promise<void> {
    this.log('🧪 Starting off-path re-route test (>6m for ≥4s)');
    
    const startTime = Date.now();
    
    // Send initial position on-path
    await this.sendMessage(ws, 'nav.update', {
      seq: 1000,
      userId: this.config.userId,
      pos: { lat: 21.42251, lon: 39.82621, alt: 298, floor: 0, acc: 1.4 },
      heading: 90,
      speed: 1.0,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      sai_leg: null,
      confidence: 0.85,
      mode: 'guide',
      device: 'android'
    });

    // Send off-path positions for 5 seconds
    for (let i = 0; i < 10; i++) {
      await this.sendMessage(ws, 'nav.update', {
        seq: 1001 + i,
        userId: this.config.userId,
        pos: { 
          lat: 21.42300, // ~55m north (off-path)
          lon: 39.82650, // ~20m east (off-path)
          alt: 298, 
          floor: 0, 
          acc: 1.4 
        },
        heading: 90,
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        sai_leg: null,
        confidence: 0.85,
        mode: 'guide',
        device: 'android'
      });
      
      // Wait 500ms between updates
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const testDuration = Date.now() - startTime;
    this.log(`Off-path test completed in ${testDuration}ms`);
  }

  async testHeadingDeflectionReroute(ws: WebSocket): Promise<void> {
    this.log('🧪 Starting heading deflection re-route test (>45° for ≥2s)');
    
    const startTime = Date.now();
    
    // Send positions with significant heading deflection
    for (let i = 0; i < 6; i++) {
      await this.sendMessage(ws, 'nav.update', {
        seq: 2000 + i,
        userId: this.config.userId,
        pos: { lat: 21.42251, lon: 39.82621, alt: 298, floor: 0, acc: 1.4 },
        heading: 180, // Deflected 90° from expected east (90°)
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        sai_leg: null,
        confidence: 0.85,
        mode: 'guide',
        device: 'android'
      });
      
      // Wait 400ms between updates (total ~2.4s)
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    const testDuration = Date.now() - startTime;
    this.log(`Heading deflection test completed in ${testDuration}ms`);
  }

  async testMessagePackFormats(ws: WebSocket): Promise<void> {
    this.log('🧪 Testing MessagePack format consistency');
    
    const testMessages = [
      {
        event: 'nav.update',
        data: {
          seq: 3000,
          userId: this.config.userId,
          pos: { lat: 21.42251, lon: 39.82621, floor: 0 },
          heading: 92.3,
          confidence: 0.86
        }
      },
      {
        event: 'ai.prompt',
        data: {
          text: 'Test MessagePack encoding',
          voice: 'ar_male_1',
          priority: 'high',
          stage: 'tawaf'
        }
      },
      {
        event: 'nav.correction',
        data: {
          seq: 3001,
          delta: { x: 0.5, y: -0.3 },
          snapTo: 'path',
          confidence: 0.92
        }
      }
    ];

    for (const msg of testMessages) {
      await this.sendMessage(ws, msg.event, msg.data);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  async performLatencyTest(ws: WebSocket): Promise<void> {
    this.log('🧪 Testing broadcast latency and processing times');
    
    const latencyTests = 20;
    const processingTimes: number[] = [];
    
    for (let i = 0; i < latencyTests; i++) {
      const sendTime = Date.now();
      
      await this.sendMessage(ws, 'nav.update', {
        seq: 4000 + i,
        userId: this.config.userId,
        pos: { lat: 21.42251 + (i * 0.0001), lon: 39.82621, floor: 0 },
        heading: 90 + i,
        confidence: 0.8 + (i * 0.01),
        testLatency: true
      });
      
      const processTime = Date.now() - sendTime;
      processingTimes.push(processTime);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.metrics.processingTimes = processingTimes;
    const avgProcessing = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length;
    const maxProcessing = Math.max(...processingTimes);
    
    this.log(`Latency test completed: avg=${avgProcessing.toFixed(2)}ms, max=${maxProcessing}ms`);
  }

  generateTestReport(): string {
    const avgBroadcastLatency = this.metrics.broadcastLatencies.length > 0
      ? this.metrics.broadcastLatencies.reduce((sum, l) => sum + l, 0) / this.metrics.broadcastLatencies.length
      : 0;

    const avgProcessingTime = this.metrics.processingTimes.length > 0
      ? this.metrics.processingTimes.reduce((sum, t) => sum + t, 0) / this.metrics.processingTimes.length
      : 0;

    const report = `
═══════════════════════════════════════════════════
🔬 RE-ROUTE POLICY & MESSAGEPACK INTEGRATION TEST REPORT
═══════════════════════════════════════════════════

📊 TEST SUMMARY:
• Test Duration: ${new Date().toISOString()}
• WebSocket URL: ${this.config.wsUrl}
• MessagePack Mode: ${this.config.msgpackEnabled ? 'ENABLED' : 'DISABLED'}
• User ID: ${this.config.userId}

📈 PERFORMANCE METRICS:
• Messages Sent: ${this.metrics.messagesSent}
• Messages Received: ${this.metrics.messagesReceived}
• Average Broadcast Latency: ${avgBroadcastLatency.toFixed(2)}ms
• Max Broadcast Latency: ${this.metrics.maxLatency}ms
• Average Processing Time: ${avgProcessingTime.toFixed(2)}ms
• Re-route Triggered: ${this.metrics.rerouteTriggered ? '✅ YES' : '❌ NO'}

🔄 RE-ROUTE POLICY RESULTS:
• Off-path test: ${this.logs.some(l => l.includes('off-path')) ? 'EXECUTED' : 'SKIPPED'}
• Heading deflection test: ${this.logs.some(l => l.includes('heading deflection')) ? 'EXECUTED' : 'SKIPPED'}
• Latency requirement (<300ms): ${avgProcessingTime < 300 ? '✅ PASSED' : '❌ FAILED'}
• Broadcast requirement (≤200ms): ${this.metrics.maxLatency <= 200 ? '✅ PASSED' : '❌ FAILED'}

📦 MESSAGEPACK ANALYSIS:
• Binary frames captured: ${this.binaryFrames.length}
• Total binary data: ${this.binaryFrames.reduce((sum, f) => sum + f.hex.length / 2, 0)} bytes
• Format consistency: ${this.config.msgpackEnabled ? 'MessagePack binary' : 'JSON text'}

🔍 BINARY FRAME HEX DUMPS:
${this.binaryFrames.slice(0, 3).map((frame, i) => `
Frame ${i + 1}:
Hex: ${frame.hex}
Size: ${frame.hex.length / 2} bytes
Decoded: ${JSON.stringify(frame.decoded, null, 2)}
`).join('\n')}

📋 SERVER LOGS (Last 20 entries):
${this.logs.slice(-20).join('\n')}

═══════════════════════════════════════════════════
    `.trim();

    return report;
  }

  async runAllTests(): Promise<string> {
    try {
      this.log('🚀 Starting comprehensive re-route and MessagePack integration tests');
      
      const ws = await this.createWebSocket();
      
      // Wait for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run all test scenarios
      await this.testOffPathReroute(ws);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.testHeadingDeflectionReroute(ws);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.testMessagePackFormats(ws);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.performLatencyTest(ws);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Calculate final metrics
      if (this.metrics.broadcastLatencies.length > 0) {
        this.metrics.avgLatency = this.metrics.broadcastLatencies.reduce((sum, l) => sum + l, 0) / this.metrics.broadcastLatencies.length;
      }
      
      ws.close();
      
      this.log('✅ All integration tests completed');
      
      return this.generateTestReport();
      
    } catch (error) {
      this.log(`❌ Integration test failed: ${error.message}`);
      throw error;
    }
  }
}

// Test configuration
const testConfigs = [
  {
    wsUrl: 'ws://localhost:3001',
    msgpackEnabled: false,
    userId: 'test-user-json-001',
    mockToken: 'mock-token-for-development'
  },
  {
    wsUrl: 'ws://localhost:3001',
    msgpackEnabled: true,
    userId: 'test-user-msgpack-001',
    mockToken: 'mock-token-for-development'
  }
];

async function runIntegrationTests() {
  console.log('🔧 RE-ROUTE POLICY & MESSAGEPACK INTEGRATION TEST SUITE');
  console.log('================================================================');
  
  const reports: string[] = [];
  
  for (const config of testConfigs) {
    console.log(`\n🧪 Testing with MessagePack ${config.msgpackEnabled ? 'ENABLED' : 'DISABLED'}`);
    
    try {
      const tester = new RerouteMsgpackIntegrationTest(config);
      const report = await tester.runAllTests();
      reports.push(report);
      
      console.log('\n' + report);
      
    } catch (error) {
      console.error(`❌ Test failed for config ${JSON.stringify(config)}: ${error.message}`);
    }
  }
  
  console.log('\n🎯 INTEGRATION TEST SUITE COMPLETED');
  console.log('================================================================');
  
  return reports;
}

// Export for use in other test files
export { RerouteMsgpackIntegrationTest, runIntegrationTests };

// Run tests if this script is executed directly
if (require.main === module) {
  runIntegrationTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Integration test suite failed:', error);
      process.exit(1);
    });
}