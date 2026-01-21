#!/bin/bash

# SSE Stream Test Script
# Tests Server-Sent Events streaming for match updates

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${BASE_URL}/api"
MATCH_ID="${1}"

if [ -z "${MATCH_ID}" ]; then
    echo "❌ Usage: ./test-sse-stream.sh <MATCH_ID>"
    echo "   Example: ./test-sse-stream.sh 123e4567-e89b-12d3-a456-426614174000"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════╗"
echo "║   ProFootball SSE Stream Test                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📡 Connecting to SSE stream..."
echo "   Match ID: ${MATCH_ID}"
echo "   URL: ${API_URL}/matches/${MATCH_ID}/events/stream"
echo ""
echo "👂 Listening for events..."
echo "   (Press Ctrl+C to stop)"
echo ""

# Use curl to stream SSE events
curl -N -H "Accept: text/event-stream" \
     "${API_URL}/matches/${MATCH_ID}/events/stream" 2>/dev/null | \
while IFS= read -r line; do
    if [[ $line == data:* ]]; then
        # Extract JSON data
        json_data="${line#data: }"
        echo "📨 Event received:"
        echo "${json_data}" | jq '.' 2>/dev/null || echo "${json_data}"
        echo ""
    elif [[ $line == event:* ]]; then
        event_type="${line#event: }"
        echo "🎯 Event type: ${event_type}"
    fi
done

