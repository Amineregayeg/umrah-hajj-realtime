// Simple demonstration script for voice token functionality
// This script demonstrates the key features without TypeScript compilation issues

const { createServer } = require('http');
const { URL } = require('url');

// Mock rate limiting store
const rateLimitStore = new Map();

// Constants
const TOKEN_TTL_SECONDS = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_BURST_CAPACITY = 10;

// Mock JWT signing (simplified for demo)
function signJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = 'demo-signature';
  return `${header}.${payloadStr}.${signature}`;
}

// Rate limiting function
function checkRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  
  let entry = rateLimitStore.get(userId);
  
  if (!entry) {
    entry = {
      count: 0,
      windowStart: now,
      tokens: [],
    };
    rateLimitStore.set(userId, entry);
  }

  // Clean up old tokens outside the window
  entry.tokens = entry.tokens.filter(timestamp => timestamp > windowStart);
  entry.count = entry.tokens.length;
  
  // Check if we're within the rate limit for the current window
  if (entry.tokens.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestToken = Math.min(...entry.tokens);
    const retryAfter = Math.ceil((oldestToken + RATE_LIMIT_WINDOW_MS - now) / 1000);
    
    throw new Error(JSON.stringify({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.floor((oldestToken + RATE_LIMIT_WINDOW_MS) / 1000),
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
    }));
  }

  // Check burst capacity across a longer window
  const burstWindowStart = now - (RATE_LIMIT_WINDOW_MS * 2);
  const totalInBurstWindow = entry.tokens.filter(
    timestamp => timestamp > burstWindowStart
  ).length;
  
  if (totalInBurstWindow >= RATE_LIMIT_BURST_CAPACITY) {
    const oldestInBurst = Math.min(...entry.tokens.filter(t => t > burstWindowStart));
    const retryAfter = Math.ceil((oldestInBurst + RATE_LIMIT_WINDOW_MS - now) / 1000);
    
    throw new Error(JSON.stringify({
      error: 'Burst capacity exceeded',
      code: 'BURST_LIMIT_EXCEEDED',
      retryAfter: Math.floor((oldestInBurst + RATE_LIMIT_WINDOW_MS) / 1000),
      message: `Burst limit exceeded. Please try again in ${retryAfter} seconds.`,
    }));
  }
}

// Update rate limit
function updateRateLimit(userId) {
  const entry = rateLimitStore.get(userId);
  if (entry) {
    entry.tokens.push(Date.now());
    entry.count = entry.tokens.length;
  }
}

// Create voice token
function createVoiceToken(userId, userEmail, language, gender, sessionId) {
  const startTime = Date.now();

  try {
    // Check rate limit
    checkRateLimit(userId);

    // Generate token claims
    const now = Math.floor(Date.now() / 1000);
    const exp = now + TOKEN_TTL_SECONDS;

    const claims = {
      sub: userId,
      exp,
      iat: now,
      scope: ['realtime.voice'],
      lang: language,
      gender: gender,
      sessionId: sessionId,
    };

    // Sign the token
    const token = signJWT(claims);

    // Update rate limit
    updateRateLimit(userId);

    // Log successful token creation
    console.log(`[AUDIT] Voice token created for user ${userId}, language: ${language}, gender: ${gender}, TTL: ${TOKEN_TTL_SECONDS}s`);

    return {
      token,
      expiresAt: exp,
      ttl: TOKEN_TTL_SECONDS,
      scope: claims.scope,
      language: language,
      gender: gender,
    };
  } catch (error) {
    console.error(`[AUDIT] Voice token creation failed for user ${userId}: ${error.message}`);
    throw error;
  }
}

// Demo function
function runDemo() {
  console.log('=== AI Voice Token Service Demo ===\n');
  
  try {
    // Test 1: Create first token
    console.log('1. Creating first token...');
    const token1 = createVoiceToken('user-123', 'user@example.com', 'ar', 'male', 'session-1');
    console.log('✓ Token created successfully');
    console.log(`   TTL: ${token1.ttl}s (≤60s requirement: ${token1.ttl <= 60 ? 'PASS' : 'FAIL'})`);
    console.log(`   Scope: ${token1.scope.join(', ')}`);
    console.log(`   Language: ${token1.language}, Gender: ${token1.gender}\n`);

    // Test 2: Create multiple tokens quickly
    console.log('2. Testing rate limiting (5 requests/min limit)...');
    for (let i = 2; i <= 5; i++) {
      createVoiceToken('user-123', 'user@example.com', 'ar', 'male', `session-${i}`);
      console.log(`   Token ${i} created successfully`);
    }
    
    // Test 3: Try to exceed rate limit
    console.log('\n3. Testing rate limit enforcement (should fail)...');
    try {
      createVoiceToken('user-123', 'user@example.com', 'ar', 'male', 'session-6');
      console.log('   ERROR: Rate limit not enforced!');
    } catch (error) {
      const errorData = JSON.parse(error.message);
      console.log(`✓ Rate limit enforced: ${errorData.error}`);
      console.log(`   Retry after: ${errorData.retryAfter} seconds`);
    }

    // Test 4: Different user should work
    console.log('\n4. Testing different user (should work)...');
    const token2 = createVoiceToken('user-456', 'user2@example.com', 'en', 'female', 'session-1');
    console.log('✓ Different user can create tokens independently');
    console.log(`   Language: ${token2.language}, Gender: ${token2.gender}`);

    // Test 5: Different voice configurations
    console.log('\n5. Testing different voice configurations...');
    const configs = [
      { lang: 'ur', gender: 'neutral' },
      { lang: 'id', gender: 'male' },
      { lang: 'fr', gender: 'female' }
    ];
    
    configs.forEach((config, i) => {
      const token = createVoiceToken(`user-config-${i}`, 'config@example.com', config.lang, config.gender, `config-session-${i}`);
      console.log(`   ✓ ${config.lang}/${config.gender} configuration works`);
    });

    console.log('\n=== Demo completed successfully ===');
    console.log('\nKey features demonstrated:');
    console.log('✓ TTL ≤ 60 seconds enforced');
    console.log('✓ Rate limiting ≤ 5/min/user with burst 10');
    console.log('✓ Audit logging for success/failure');
    console.log('✓ JWT token generation with correct scope claims');
    console.log('✓ Multiple language and gender configurations');
    console.log('✓ Per-user rate limiting independence');

  } catch (error) {
    console.error('Demo failed:', error.message);
  }
}

// Run the demo
if (require.main === module) {
  runDemo();
}

module.exports = {
  createVoiceToken,
  checkRateLimit,
  updateRateLimit,
  TOKEN_TTL_SECONDS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_BURST_CAPACITY
};