#!/bin/bash

# AI Realtime Endpoint Test Script
# Tests the /ai/realtime/session endpoint after removing auth requirements

set -e

BACKEND_URL="https://psychological-jilli-amineregayeg-1fe35444.koyeb.app"
ENDPOINT="/ai/realtime/session"

echo "=========================================="
echo "AI Realtime Endpoint Test Suite"
echo "=========================================="
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Endpoint: $ENDPOINT"
echo "Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Basic session creation (English, Male, Umrah)
echo "=========================================="
echo "Test 1: Basic Session Creation"
echo "=========================================="
echo "Request: English, Male, Umrah"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en",
    "gender": "male",
    "ritualType": "umrah"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Test 1 PASSED${NC}"

    # Verify response structure
    SESSION_ID=$(echo "$BODY" | jq -r '.sessionId' 2>/dev/null)
    WEBSOCKET_URL=$(echo "$BODY" | jq -r '.websocketUrl' 2>/dev/null)
    EPHEMERAL_TOKEN=$(echo "$BODY" | jq -r '.ephemeralToken' 2>/dev/null)
    VOICE=$(echo "$BODY" | jq -r '.voice' 2>/dev/null)

    if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
        echo -e "${GREEN}  ✓ sessionId present: $SESSION_ID${NC}"
    else
        echo -e "${RED}  ✗ sessionId missing${NC}"
    fi

    if [ -n "$WEBSOCKET_URL" ] && [ "$WEBSOCKET_URL" != "null" ]; then
        echo -e "${GREEN}  ✓ websocketUrl present${NC}"

        # Check if using gpt-realtime model
        if echo "$WEBSOCKET_URL" | grep -q "model=gpt-realtime"; then
            echo -e "${GREEN}  ✓ Model is gpt-realtime (CORRECT!)${NC}"
        else
            echo -e "${YELLOW}  ⚠ Model might not be gpt-realtime: $WEBSOCKET_URL${NC}"
        fi
    else
        echo -e "${RED}  ✗ websocketUrl missing${NC}"
    fi

    if [ -n "$EPHEMERAL_TOKEN" ] && [ "$EPHEMERAL_TOKEN" != "null" ]; then
        echo -e "${GREEN}  ✓ ephemeralToken present (length: ${#EPHEMERAL_TOKEN})${NC}"
    else
        echo -e "${RED}  ✗ ephemeralToken missing${NC}"
    fi

    if [ "$VOICE" = "verse" ]; then
        echo -e "${GREEN}  ✓ Voice correctly set to 'verse' for male${NC}"
    else
        echo -e "${YELLOW}  ⚠ Voice is '$VOICE' (expected 'verse' for male)${NC}"
    fi
else
    echo -e "${RED}✗ Test 1 FAILED - HTTP $HTTP_CODE${NC}"
fi

echo ""
sleep 2

# Test 2: Female user (should get 'coral' voice)
echo "=========================================="
echo "Test 2: Female User (Arabic, Hajj)"
echo "=========================================="
echo "Request: Arabic, Female, Hajj"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ar",
    "gender": "female",
    "ritualType": "hajj",
    "madhhab": "hanafi"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Test 2 PASSED${NC}"

    VOICE=$(echo "$BODY" | jq -r '.voice' 2>/dev/null)
    LANGUAGE=$(echo "$BODY" | jq -r '.language' 2>/dev/null)

    if [ "$VOICE" = "coral" ]; then
        echo -e "${GREEN}  ✓ Voice correctly set to 'coral' for female${NC}"
    else
        echo -e "${YELLOW}  ⚠ Voice is '$VOICE' (expected 'coral' for female)${NC}"
    fi

    if [ "$LANGUAGE" = "ar" ]; then
        echo -e "${GREEN}  ✓ Language correctly set to 'ar'${NC}"
    else
        echo -e "${YELLOW}  ⚠ Language is '$LANGUAGE' (expected 'ar')${NC}"
    fi
else
    echo -e "${RED}✗ Test 2 FAILED - HTTP $HTTP_CODE${NC}"
fi

echo ""
sleep 2

# Test 3: Minimal request (defaults)
echo "=========================================="
echo "Test 3: Minimal Request (Defaults)"
echo "=========================================="
echo "Request: Empty body (should use defaults)"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Test 3 PASSED${NC}"

    LANGUAGE=$(echo "$BODY" | jq -r '.language' 2>/dev/null)
    VOICE=$(echo "$BODY" | jq -r '.voice' 2>/dev/null)

    if [ "$LANGUAGE" = "en" ]; then
        echo -e "${GREEN}  ✓ Default language is 'en'${NC}"
    else
        echo -e "${YELLOW}  ⚠ Language is '$LANGUAGE' (expected 'en' default)${NC}"
    fi

    if [ "$VOICE" = "alloy" ]; then
        echo -e "${GREEN}  ✓ Default voice is 'alloy' (neutral)${NC}"
    else
        echo -e "${YELLOW}  ⚠ Voice is '$VOICE' (expected 'alloy' for unspecified gender)${NC}"
    fi
else
    echo -e "${RED}✗ Test 3 FAILED - HTTP $HTTP_CODE${NC}"
fi

echo ""
sleep 2

# Test 4: French language
echo "=========================================="
echo "Test 4: French Language"
echo "=========================================="
echo "Request: French, Male, Umrah"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "fr",
    "gender": "male",
    "ritualType": "umrah"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Test 4 PASSED${NC}"

    LANGUAGE=$(echo "$BODY" | jq -r '.language' 2>/dev/null)

    if [ "$LANGUAGE" = "fr" ]; then
        echo -e "${GREEN}  ✓ Language correctly set to 'fr'${NC}"
    else
        echo -e "${YELLOW}  ⚠ Language is '$LANGUAGE' (expected 'fr')${NC}"
    fi
else
    echo -e "${RED}✗ Test 4 FAILED - HTTP $HTTP_CODE${NC}"
fi

echo ""
sleep 2

# Test 5: Custom userId (for Unity testing)
echo "=========================================="
echo "Test 5: Custom userId (Unity Testing)"
echo "=========================================="
echo "Request: With custom userId"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en",
    "gender": "male",
    "ritualType": "umrah",
    "userId": "unity-test-user-123"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Test 5 PASSED${NC}"
    echo -e "${GREEN}  ✓ Custom userId accepted${NC}"
else
    echo -e "${RED}✗ Test 5 FAILED - HTTP $HTTP_CODE${NC}"
fi

echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "All tests completed!"
echo ""
echo "Next Steps:"
echo "1. Verify Koyeb environment variable REALTIME_MODEL=gpt-realtime"
echo "2. Check that websocketUrl contains 'model=gpt-realtime'"
echo "3. Test WebSocket connection with ephemeralToken"
echo "4. Integrate with Unity using UNITY_AI_INTEGRATION_GUIDE.md"
echo ""
echo "For production deployment:"
echo "- Re-enable authentication guards in ai.controller.ts"
echo "- Remove userId from request body"
echo "- Enable user rollout validation"
echo ""
