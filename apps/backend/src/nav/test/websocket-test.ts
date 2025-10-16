#!/usr/bin/env ts-node

/**
 * WebSocket Gateway Test Script
 * 
 * This script demonstrates how to connect to the WebSocket gateway
 * and send/receive messages following the event contracts.
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001';

// Mock JWT token for development (when AUTH_MODE=mock)
const MOCK_TOKEN = 'mock-token-for-development';

// Test data following the exact event contracts from 07b_ws_events.json
const testMessages = {
  'nav.update': {
    ts: Date.now(),
    seq: 1234,
    userId: "test_user_123",
    pos: {
      lat: 21.42251,
      lon: 39.82621,
      alt: 298,
      floor: 0,
      acc: 1.4
    },
    heading: 92.3,
    speed: 0.8,
    source: "gnss" as const,
    stage: "tawaf",
    lap: 3,
    sai_leg: null,
    confidence: 0.86,
    mode: "guide" as const,
    device: "android" as const
  },
  'nav.correction': {
    ts: Date.now(),
    seq: 678,
    delta: {
      x: 0.6,
      y: -0.2
    },
    snapTo: "path",
    confidence: 0.93
  },
  'ai.prompt': {
    ts: Date.now(),
    text: "Approaching Safa. Prepare for Sa'i.",
    voice: "ar_male_1",
    priority: "high" as const,
    stage: "sai"
  },
  'ui.banner': {
    id: "maqam_info",
    title: "Maqām Ibrāhīm",
    body: "Sunnah to pray two rakaʿāt here.",
    level: "info" as const
  },
  'state.set': {
    mode: "guide" as const,
    madhhab: "hanafi" as const,
    lang: "ar",
    accessibility: {
      mobility: "wheelchair"
    }
  }
};

function createWebSocketConnection(): WebSocket {
  // Include token in query parameter for authentication
  const wsUrl = `${WS_URL}?token=${MOCK_TOKEN}`;
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    console.log('✅ WebSocket connection established');
    console.log('📡 Features: JWT auth, heartbeat (15s), rate limiting (10Hz/5Hz), queues (≤50), Zod validation');
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received:', JSON.stringify(message, null, 2));
    } catch (error) {
      console.error('❌ Failed to parse message:', data.toString());
    }
  });

  ws.on('error', (error: Error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  ws.on('close', (code: number, reason: string) => {
    console.log(`🔌 WebSocket connection closed: ${code} - ${reason}`);
  });

  // Handle ping/pong for heartbeat
  ws.on('ping', () => {
    console.log('🏓 Received ping, sending pong');
    ws.pong();
  });

  return ws;
}

function sendTestMessage(ws: WebSocket, event: string, data: any) {
  if (ws.readyState !== WebSocket.OPEN) {
    console.error('❌ WebSocket not open');
    return;
  }

  const message = JSON.stringify({ event, data });
  console.log(`📤 Sending ${event}:`, JSON.stringify(data, null, 2));
  ws.send(message);
}

function runTests() {
  console.log('🚀 Starting WebSocket Gateway Tests');
  console.log('🔗 Connecting to:', WS_URL);
  
  const ws = createWebSocketConnection();

  ws.on('open', () => {
    let testIndex = 0;
    const eventTypes = Object.keys(testMessages) as Array<keyof typeof testMessages>;

    // Send test messages with delay to avoid rate limiting
    const sendNextTest = () => {
      if (testIndex < eventTypes.length) {
        const eventType = eventTypes[testIndex];
        const testData = testMessages[eventType];
        sendTestMessage(ws, eventType, testData);
        testIndex++;
        setTimeout(sendNextTest, 1000); // 1 second delay between messages
      } else {
        console.log('✅ All test messages sent');
        // Test ping message
        setTimeout(() => {
          sendTestMessage(ws, 'ping', { timestamp: Date.now() });
        }, 1000);
        
        // Close connection after tests
        setTimeout(() => {
          ws.close();
        }, 3000);
      }
    };

    // Start sending test messages after connection is established
    setTimeout(sendNextTest, 1000);
  });
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

export { createWebSocketConnection, sendTestMessage, testMessages };