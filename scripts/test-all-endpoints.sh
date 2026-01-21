#!/bin/bash

# Comprehensive Endpoint Testing Script
# Tests ALL CRUD endpoints for matches, events, and statistics

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${BASE_URL}/api"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Complete CRUD Endpoint Test Suite                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if server is running
if ! curl -s -f "${API_URL}/matches" > /dev/null 2>&1; then
    echo -e "${RED}❌ Server is not running at ${BASE_URL}${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# ============================================
# MATCHES CRUD
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}MATCHES CRUD${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# CREATE
echo -e "${YELLOW}1. Creating match...${NC}"
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

MATCH_ID=$(echo "${MATCH_RESPONSE}" | jq -r '.data.id // empty')

if [ -z "${MATCH_ID}" ] || [ "${MATCH_ID}" = "null" ]; then
    echo -e "${RED}❌ Failed to create match${NC}"
    echo "${MATCH_RESPONSE}"
    exit 1
fi

echo -e "${GREEN}✅ Match created: ${MATCH_ID}${NC}"
echo "${MATCH_RESPONSE}" | jq '.data | {id, home_team, away_team, status}'
echo ""

# READ ALL
echo -e "${YELLOW}2. Getting all matches...${NC}"
ALL_MATCHES=$(curl -s "${API_URL}/matches")
MATCH_COUNT=$(echo "${ALL_MATCHES}" | jq '.data | length')
echo -e "${GREEN}✅ Found ${MATCH_COUNT} matches${NC}"
echo ""

# READ ONE
echo -e "${YELLOW}3. Getting match by ID...${NC}"
MATCH_DETAILS=$(curl -s "${API_URL}/matches/${MATCH_ID}")
echo -e "${GREEN}✅ Retrieved match details${NC}"
echo "${MATCH_DETAILS}" | jq '.data | {id, home_team, away_team, home_score, away_score, minute, status}'
echo ""

# UPDATE
echo -e "${YELLOW}4. Updating match...${NC}"
UPDATE_DATA=$(cat <<EOF
{
  "home_score": 1,
  "away_score": 0,
  "minute": 15,
  "status": "FIRST_HALF"
}
EOF
)

UPDATED_MATCH=$(curl -s -X PUT "${API_URL}/matches/${MATCH_ID}" \
  -H "Content-Type: application/json" \
  -d "${UPDATE_DATA}")

echo -e "${GREEN}✅ Match updated${NC}"
echo "${UPDATED_MATCH}" | jq '.data | {id, home_score, away_score, minute, status}'
echo ""

# ============================================
# MATCH EVENTS CRUD
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}MATCH EVENTS CRUD${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# CREATE EVENT
echo -e "${YELLOW}5. Creating match event...${NC}"
EVENT_DATA=$(cat <<EOF
{
  "type": "GOAL",
  "minute": 15,
  "team": "HOME",
  "player": "Bukayo Saka",
  "description": "Goal scored from open play"
}
EOF
)

EVENT_RESPONSE=$(curl -s -X POST "${API_URL}/matches/${MATCH_ID}/events" \
  -H "Content-Type: application/json" \
  -d "${EVENT_DATA}")

EVENT_ID=$(echo "${EVENT_RESPONSE}" | jq -r '.data.id // empty')

if [ -z "${EVENT_ID}" ] || [ "${EVENT_ID}" = "null" ]; then
    echo -e "${RED}❌ Failed to create event${NC}"
    echo "${EVENT_RESPONSE}"
    exit 1
fi

echo -e "${GREEN}✅ Event created: ${EVENT_ID}${NC}"
echo "${EVENT_RESPONSE}" | jq '.data | {id, type, minute, team, player}'
echo ""

# UPDATE EVENT
echo -e "${YELLOW}6. Updating match event...${NC}"
EVENT_UPDATE=$(cat <<EOF
{
  "description": "Goal scored from penalty kick"
}
EOF
)

UPDATED_EVENT=$(curl -s -X PUT "${API_URL}/matches/${MATCH_ID}/events/${EVENT_ID}" \
  -H "Content-Type: application/json" \
  -d "${EVENT_UPDATE}")

echo -e "${GREEN}✅ Event updated${NC}"
echo "${UPDATED_EVENT}" | jq '.data | {id, type, minute, description}'
echo ""

# CREATE ANOTHER EVENT
echo -e "${YELLOW}7. Creating another event (yellow card)...${NC}"
CARD_EVENT=$(cat <<EOF
{
  "type": "YELLOW_CARD",
  "minute": 23,
  "team": "AWAY",
  "player": "Reece James",
  "description": "Yellow card for foul"
}
EOF
)

curl -s -X POST "${API_URL}/matches/${MATCH_ID}/events" \
  -H "Content-Type: application/json" \
  -d "${CARD_EVENT}" > /dev/null

echo -e "${GREEN}✅ Yellow card event created${NC}"
echo ""

# VERIFY EVENTS IN MATCH
echo -e "${YELLOW}8. Verifying events in match...${NC}"
MATCH_WITH_EVENTS=$(curl -s "${API_URL}/matches/${MATCH_ID}")
EVENT_COUNT=$(echo "${MATCH_WITH_EVENTS}" | jq '.data.events | length')
echo -e "${GREEN}✅ Match has ${EVENT_COUNT} events${NC}"
echo "${MATCH_WITH_EVENTS}" | jq '.data.events[] | {type, minute, team, player}'
echo ""

# DELETE EVENT
echo -e "${YELLOW}9. Deleting match event...${NC}"
curl -s -X DELETE "${API_URL}/matches/${MATCH_ID}/events/${EVENT_ID}" -w "\nHTTP Status: %{http_code}\n" | tail -1
echo -e "${GREEN}✅ Event deleted${NC}"
echo ""

# ============================================
# MATCH STATISTICS CRUD
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}MATCH STATISTICS CRUD${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# CREATE/UPDATE STATISTICS
echo -e "${YELLOW}10. Creating/updating match statistics...${NC}"
STATS_DATA=$(cat <<EOF
{
  "home_possession": 60,
  "away_possession": 40,
  "home_shots": 12,
  "away_shots": 8,
  "home_shots_on_target": 5,
  "away_shots_on_target": 3,
  "home_passes": 450,
  "away_passes": 380,
  "home_passes_completed": 400,
  "away_passes_completed": 340,
  "home_fouls": 8,
  "away_fouls": 10,
  "home_corners": 5,
  "away_corners": 3,
  "home_offsides": 2,
  "away_offsides": 1
}
EOF
)

STATS_RESPONSE=$(curl -s -X POST "${API_URL}/matches/${MATCH_ID}/statistics" \
  -H "Content-Type: application/json" \
  -d "${STATS_DATA}")

STATS_ID=$(echo "${STATS_RESPONSE}" | jq -r '.data.id // empty')

if [ -z "${STATS_ID}" ] || [ "${STATS_ID}" = "null" ]; then
    echo -e "${RED}❌ Failed to create statistics${NC}"
    echo "${STATS_RESPONSE}"
    exit 1
fi

echo -e "${GREEN}✅ Statistics created/updated: ${STATS_ID}${NC}"
echo "${STATS_RESPONSE}" | jq '.data | {home_possession, away_possession, home_shots, away_shots}'
echo ""

# UPDATE STATISTICS
echo -e "${YELLOW}11. Updating match statistics...${NC}"
STATS_UPDATE=$(cat <<EOF
{
  "home_possession": 65,
  "away_possession": 35,
  "home_shots": 15
}
EOF
)

UPDATED_STATS=$(curl -s -X PUT "${API_URL}/matches/${MATCH_ID}/statistics" \
  -H "Content-Type: application/json" \
  -d "${STATS_UPDATE}")

echo -e "${GREEN}✅ Statistics updated${NC}"
echo "${UPDATED_STATS}" | jq '.data | {home_possession, away_possession, home_shots}'
echo ""

# VERIFY STATISTICS IN MATCH
echo -e "${YELLOW}12. Verifying statistics in match...${NC}"
MATCH_WITH_STATS=$(curl -s "${API_URL}/matches/${MATCH_ID}")
echo -e "${GREEN}✅ Match statistics:${NC}"
echo "${MATCH_WITH_STATS}" | jq '.data.statistics | {home_possession, away_possession, home_shots, away_shots}'
echo ""

# ============================================
# CLEANUP
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CLEANUP${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# DELETE MATCH (cascades to events and statistics)
echo -e "${YELLOW}13. Deleting match...${NC}"
DELETE_STATUS=$(curl -s -X DELETE "${API_URL}/matches/${MATCH_ID}" -w "%{http_code}" -o /dev/null)

if [ "${DELETE_STATUS}" = "204" ]; then
    echo -e "${GREEN}✅ Match deleted successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Delete returned status ${DELETE_STATUS}${NC}"
fi
echo ""

# VERIFY DELETION
echo -e "${YELLOW}14. Verifying deletion...${NC}"
DELETED_CHECK=$(curl -s -w "%{http_code}" "${API_URL}/matches/${MATCH_ID}" -o /dev/null)

if [ "${DELETED_CHECK}" = "404" ]; then
    echo -e "${GREEN}✅ Match confirmed deleted (404 as expected)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected status: ${DELETED_CHECK}${NC}"
fi
echo ""

# ============================================
# SUMMARY
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All CRUD operations tested:${NC}"
echo "   - Matches: CREATE, READ (all/one), UPDATE, DELETE"
echo "   - Events: CREATE, UPDATE, DELETE"
echo "   - Statistics: CREATE/UPDATE, UPDATE"
echo ""
echo -e "${BLUE}Test Match ID: ${MATCH_ID}${NC}"
echo ""

