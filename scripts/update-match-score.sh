#!/bin/bash

# Manual Match Score Update Script
# Updates match scores directly in the database to test real-time streaming

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${BASE_URL}/api"
MATCH_ID="${1}"
HOME_SCORE="${2:-0}"
AWAY_SCORE="${3:-0}"
MINUTE="${4:-0}"

if [ -z "${MATCH_ID}" ]; then
    echo "❌ Usage: ./update-match-score.sh <MATCH_ID> [home_score] [away_score] [minute]"
    echo "   Example: ./update-match-score.sh 123e4567-e89b-12d3-a456-426614174000 1 0 15"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Manual Match Score Update                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Updating match: ${MATCH_ID}"
echo "   Score: ${HOME_SCORE} - ${AWAY_SCORE}"
echo "   Minute: ${MINUTE}'"
echo ""

# Note: This requires direct database access or a PATCH endpoint
# For now, we'll use a workaround via the gateway if available
# Or provide instructions for manual database update

echo "⚠️  Note: Direct score updates require database access."
echo "   For testing real-time updates, use the simulator instead:"
echo "   POST ${API_URL}/simulator/matches/${MATCH_ID}/start"
echo ""
echo "   Or update scores via database:"
echo "   UPDATE matches SET home_score=${HOME_SCORE}, away_score=${AWAY_SCORE}, minute=${MINUTE} WHERE id='${MATCH_ID}';"
echo ""
echo "   Then trigger a broadcast via the MatchesGateway.broadcastScoreUpdate() method"
echo ""

