#!/usr/bin/env node

/**
 * Test OpenAI API Connection
 * Verifies API key and gpt-realtime model availability
 */

const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key-here';

console.log('🔍 Testing OpenAI API Connection...\n');

// Test 1: List Models
const listModelsOptions = {
  hostname: 'api.openai.com',
  path: '/v1/models',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(listModelsOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      const models = response.data || [];

      console.log('✅ API Key Valid!\n');
      console.log(`📊 Total Models Available: ${models.length}\n`);

      // Check for realtime models
      const realtimeModels = models.filter(m => m.id.includes('realtime'));

      console.log('🎤 Realtime Models:');
      if (realtimeModels.length > 0) {
        realtimeModels.forEach(model => {
          console.log(`  • ${model.id}`);
        });

        // Check if gpt-realtime is available
        const hasGptRealtime = realtimeModels.some(m => m.id === 'gpt-realtime');
        if (hasGptRealtime) {
          console.log('\n✅ gpt-realtime model is available!');
        } else {
          console.log('\n⚠️  gpt-realtime model not found. Available models:');
          console.log(realtimeModels.map(m => `  • ${m.id}`).join('\n'));
        }
      } else {
        console.log('  ⚠️  No realtime models found in response');
        console.log('  This might be normal - realtime models may not appear in /v1/models');
      }

      // Check for GPT-4 models
      const gpt4Models = models.filter(m => m.id.includes('gpt-4'));
      console.log(`\n🤖 GPT-4 Models Available: ${gpt4Models.length}`);

      console.log('\n✅ Configuration looks good!');
      console.log('\nNext steps:');
      console.log('  1. Start backend: cd apps/backend && pnpm dev');
      console.log('  2. Test AI endpoint: POST /ai/realtime/session');
      console.log('  3. Monitor logs for "AI Realtime features enabled"');

    } else if (res.statusCode === 401) {
      console.log('❌ Authentication Failed!');
      console.log('API Key is invalid or expired.');
      console.log('Please check your OPENAI_API_KEY in .env file.');
    } else {
      console.log(`❌ Request Failed: ${res.statusCode}`);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Connection Error:');
  console.log(error.message);
});

req.end();
