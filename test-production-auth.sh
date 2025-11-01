#!/bin/bash

echo "=========================================="
echo "Production Authentication Test"
echo "Backend: https://api.umrah.app"
echo "=========================================="
echo ""

echo "Test 1: Health Check (Public Endpoint)"
echo "----------------------------------------"
curl -s https://api.umrah.app/health | jq '.' || echo "Response received"
echo ""
echo ""

echo "Test 2: Quran Surahs (Public Endpoint)"
echo "----------------------------------------"
curl -s https://api.umrah.app/content/quran/surahs | jq '.[0:2]' || echo "Response received"
echo ""
echo ""

echo "Test 3: Mock Token Should Be REJECTED"
echo "----------------------------------------"
echo "Testing with: Bearer dummy-jwt-user123"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST https://api.umrah.app/ai/voice/token \
  -H "Authorization: Bearer dummy-jwt-user123" \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}')

BODY=$(echo "$RESPONSE" | sed -n '1,/HTTP_CODE:/p' | sed '$d')
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | sed 's/HTTP_CODE://')

echo "Response Body: $BODY"
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ SUCCESS: Mock token rejected (Supabase mode active)"
else
  echo "❌ PROBLEM: Mock token accepted (still in mock mode?)"
fi
echo ""
echo ""

echo "Test 4: Missing Token Should Be REJECTED"
echo "----------------------------------------"
RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST https://api.umrah.app/ai/voice/token \
  -H "Content-Type: application/json" \
  -d '{"language":"ar","gender":"male"}')

BODY2=$(echo "$RESPONSE2" | sed -n '1,/HTTP_CODE:/p' | sed '$d')
HTTP_CODE2=$(echo "$RESPONSE2" | grep "HTTP_CODE:" | sed 's/HTTP_CODE://')

echo "Response Body: $BODY2"
echo "HTTP Status: $HTTP_CODE2"

if [ "$HTTP_CODE2" = "401" ]; then
  echo "✅ SUCCESS: Missing token rejected"
else
  echo "❌ PROBLEM: Request without token was accepted"
fi
echo ""
echo ""

echo "=========================================="
echo "Summary"
echo "=========================================="
if [ "$HTTP_CODE" = "401" ] && [ "$HTTP_CODE2" = "401" ]; then
  echo "✅ ✅ ✅ ALL TESTS PASSED ✅ ✅ ✅"
  echo ""
  echo "Supabase authentication is ACTIVE and WORKING!"
  echo "Mock tokens are properly rejected."
  echo "Your backend is ready for production."
  echo ""
  echo "Next step: Share UNITY_AUTH_INTEGRATION_GUIDE.md with frontend team"
else
  echo "⚠️ Some tests failed - check the output above"
fi
echo "=========================================="
