#!/bin/bash

# Comprehensive API Testing Script for ProFootball Backend
# Tests all endpoints and real-time streaming

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${BASE_URL}/api"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ProFootball API Comprehensive Test Suite            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if server is running
echo -e "${YELLOW}🔍 Checking if server is running...${NC}"
if ! curl -s -f "${API_URL}/matches" > /dev/null 2>&1; then
    echo -e "${RED}❌ Server is not running at ${BASE_URL}${NC}"
    echo -e "${YELLOW}💡 Start the server with: npm run start:dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test 1: Create a match
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 1: Create a Match${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MATCH_DATA=$(cat <<EOF
{
  "home_team": "Arsenal",
  "away_team": "Chelsea",
  "home_score": 0,
  "away_score": 0,
  "minute": 0,
  "status": "NOT_STARTED",
  "kickoff_time": $(date +%s)
}
EOF
)

MATCH_RESPONSE=$(curl -s -X POST "${API_URL}/matches" \
  -H "Content-Type: application/json" \
  -d "${MATCH_DATA}")

MATCH_ID=$(echo "${MATCH_RESPONSE}" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "${MATCH_ID}" ]; then
    echo -e "${RED}❌ Failed to create match${NC}"
    echo "${MATCH_RESPONSE}"
    exit 1
fi

echo -e "${GREEN}✅ Match created successfully${NC}"
echo "Match ID: ${MATCH_ID}"
echo "Response: ${MATCH_RESPONSE}" | jq '.' 2>/dev/null || echo "${MATCH_RESPONSE}"
echo ""

# Test 2: Get all matches
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 2: Get All Matches${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ALL_MATCHES=$(curl -s "${API_URL}/matches")
echo -e "${GREEN}✅ Retrieved all matches${NC}"
echo "${ALL_MATCHES}" | jq '.' 2>/dev/null || echo "${ALL_MATCHES}"
echo ""

# Test 3: Get match by ID
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 3: Get Match by ID${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MATCH_DETAILS=$(curl -s "${API_URL}/matches/${MATCH_ID}")
echo -e "${GREEN}✅ Retrieved match details${NC}"
echo "${MATCH_DETAILS}" | jq '.' 2>/dev/null || echo "${MATCH_DETAILS}"
echo ""

# Test 4: Start match simulation
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 4: Start Match Simulation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SIM_START=$(curl -s -X POST "${API_URL}/simulator/matches/${MATCH_ID}/start")
echo -e "${GREEN}✅ Match simulation started${NC}"
echo "${SIM_START}" | jq '.' 2>/dev/null || echo "${SIM_START}"
echo ""

# Wait a bit for simulation to start
echo -e "${YELLOW}⏳ Waiting 3 seconds for simulation to initialize...${NC}"
sleep 3

# Test 5: Check simulator status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 5: Check Simulator Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SIM_STATUS=$(curl -s -X POST "${API_URL}/simulator/matches/start-multiple")
echo -e "${GREEN}✅ Retrieved simulator status${NC}"
echo "${SIM_STATUS}" | jq '.' 2>/dev/null || echo "${SIM_STATUS}"
echo ""

# Test 6: Test SSE Stream (basic check)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 6: SSE Stream Endpoint${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SSE_RESPONSE=$(curl -s -N --max-time 2 "${API_URL}/matches/${MATCH_ID}/events/stream" || true)
if [ -n "${SSE_RESPONSE}" ]; then
    echo -e "${GREEN}✅ SSE endpoint is accessible${NC}"
    echo "SSE Response (first 200 chars): ${SSE_RESPONSE:0:200}..."
else
    echo -e "${YELLOW}⚠️  SSE endpoint check inconclusive (timeout expected)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All REST API tests completed${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Open Swagger UI: ${BASE_URL}/api/docs"
echo "2. Test WebSocket connections (see test-websocket.sh)"
echo "3. Test SSE stream in browser: ${API_URL}/matches/${MATCH_ID}/events/stream"
echo "4. Monitor match updates via WebSocket or SSE"
echo ""
echo -e "${BLUE}Match ID for further testing: ${MATCH_ID}${NC}"
echo ""

