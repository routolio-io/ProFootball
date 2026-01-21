#!/bin/bash

# Complete API Test Suite
# Tests all endpoints, creates matches, starts simulation, and tests real-time updates

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${BASE_URL}/api"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ProFootball Complete API Test Suite              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Run REST API tests
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 1: Testing REST API Endpoints${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

./scripts/test-api.sh

# Extract match ID from the test output or create a new one
echo -e "${YELLOW}Creating a test match for real-time testing...${NC}"
MATCH_DATA=$(cat <<EOF
{
  "home_team": "Manchester United",
  "away_team": "Liverpool",
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
    exit 1
fi

echo -e "${GREEN}✅ Test match created: ${MATCH_ID}${NC}"
echo ""

# Step 2: Start simulation
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 2: Starting Match Simulation${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

curl -s -X POST "${API_URL}/simulator/matches/${MATCH_ID}/start" | jq '.'
echo ""
echo -e "${GREEN}✅ Simulation started${NC}"
echo -e "${YELLOW}⏳ Waiting 5 seconds for simulation to initialize...${NC}"
sleep 5
echo ""

# Step 3: Instructions for real-time testing
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 3: Real-Time Testing Options${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Option A: Test WebSocket (in another terminal)${NC}"
echo "   node scripts/test-websocket.js ${MATCH_ID}"
echo ""
echo -e "${BLUE}Option B: Test SSE Stream (in another terminal)${NC}"
echo "   ./scripts/test-sse-stream.sh ${MATCH_ID}"
echo ""
echo -e "${BLUE}Option C: Use Swagger UI${NC}"
echo "   Open: ${BASE_URL}/api/docs"
echo "   - Test all endpoints interactively"
echo "   - View request/response schemas"
echo ""
echo -e "${BLUE}Option D: Monitor Updates via curl${NC}"
echo "   Watch match details:"
echo "   watch -n 1 'curl -s ${API_URL}/matches/${MATCH_ID} | jq .'"
echo ""
echo -e "${GREEN}Match ID: ${MATCH_ID}${NC}"
echo ""
echo -e "${YELLOW}The simulation is running. Updates will appear every second.${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop this script (simulation continues).${NC}"
echo ""

# Keep script running and show periodic updates
while true; do
    sleep 10
    echo -e "${BLUE}[$(date +%H:%M:%S)] Checking match status...${NC}"
    MATCH_STATUS=$(curl -s "${API_URL}/matches/${MATCH_ID}" | jq -r '.data | "\(.home_team) \(.home_score) - \(.away_score) \(.away_team) (\(.minute)\') - \(.status)"' 2>/dev/null)
    echo "   ${MATCH_STATUS}"
    echo ""
done

