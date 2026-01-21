# Terminal Commands from Test Scripts

This document contains all the separate terminal commands extracted from the test scripts, organized in sequence.

## Prerequisites
Make sure your server is running:
```bash
npm run start:dev
```

---

## 1. Basic API Testing (`test-api.sh`)

### Check if server is running
```bash
curl -s -f http://localhost:3000/api/matches
```

### Create a match
```bash
curl -s -X POST "http://localhost:3000/api/matches" \
  -H "Content-Type: application/json" \
  -d '{
    "home_team": "Arsenal",
    "away_team": "Chelsea",
    "home_score": 0,
    "away_score": 0,
    "minute": 0,
    "status": "NOT_STARTED",
    "kickoff_time": '$(date +%s)'
  }'
```

### Get all matches
```bash
curl -s "http://localhost:3000/api/matches"
```

### Get match by ID (replace MATCH_ID)
```bash
curl -s "http://localhost:3000/api/matches/<MATCH_ID>"
```

### Start match simulation
```bash
curl -s -X POST "http://localhost:3000/api/simulator/matches/<MATCH_ID>/start"
```

### Start multiple matches simulation
```bash
curl -s -X POST "http://localhost:3000/api/simulator/matches/start-multiple"
```

### Test SSE stream (basic check)
```bash
curl -s -N --max-time 2 "http://localhost:3000/api/matches/<MATCH_ID>/events/stream"
```

---

## 2. Complete CRUD Testing (`test-all-endpoints.sh`)

### Create a match
```bash
curl -s -X POST "http://localhost:3000/api/matches" \
  -H "Content-Type: application/json" \
  -d '{
    "home_team": "Arsenal",
    "away_team": "Chelsea",
    "home_score": 0,
    "away_score": 0,
    "minute": 0,
    "status": "NOT_STARTED",
    "kickoff_time": '$(date +%s)'
  }'
```

### Get all matches
```bash
curl -s "http://localhost:3000/api/matches"
```

### Get match by ID
```bash
curl -s "http://localhost:3000/api/matches/<MATCH_ID>"
```

### Update match
```bash
curl -s -X PUT "http://localhost:3000/api/matches/<MATCH_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "home_score": 1,
    "away_score": 0,
    "minute": 15,
    "status": "FIRST_HALF"
  }'
```

### Create match event
```bash
curl -s -X POST "http://localhost:3000/api/matches/<MATCH_ID>/events" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "GOAL",
    "minute": 15,
    "team": "HOME",
    "player": "Bukayo Saka",
    "description": "Goal scored from open play"
  }'
```

### Update match event
```bash
curl -s -X PUT "http://localhost:3000/api/matches/<MATCH_ID>/events/<EVENT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Goal scored from penalty kick"
  }'
```

### Create another event (yellow card)
```bash
curl -s -X POST "http://localhost:3000/api/matches/<MATCH_ID>/events" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "YELLOW_CARD",
    "minute": 23,
    "team": "AWAY",
    "player": "Reece James",
    "description": "Yellow card for foul"
  }'
```

### Verify events in match
```bash
curl -s "http://localhost:3000/api/matches/<MATCH_ID>"
```

### Delete match event
```bash
curl -s -X DELETE "http://localhost:3000/api/matches/<MATCH_ID>/events/<EVENT_ID>"
```

### Create/update match statistics
```bash
curl -s -X POST "http://localhost:3000/api/matches/<MATCH_ID>/statistics" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### Update match statistics
```bash
curl -s -X PUT "http://localhost:3000/api/matches/<MATCH_ID>/statistics" \
  -H "Content-Type: application/json" \
  -d '{
    "home_possession": 65,
    "away_possession": 35,
    "home_shots": 15
  }'
```

### Verify statistics in match
```bash
curl -s "http://localhost:3000/api/matches/<MATCH_ID>"
```

### Delete match (cascades to events and statistics)
```bash
curl -s -X DELETE "http://localhost:3000/api/matches/<MATCH_ID>"
```

### Verify deletion
```bash
curl -s "http://localhost:3000/api/matches/<MATCH_ID>"
```

---

## 3. Complete Test Suite (`test-all.sh`)

### Run REST API tests
```bash
./scripts/test-api.sh
```

### Create a test match for real-time testing
```bash
curl -s -X POST "http://localhost:3000/api/matches" \
  -H "Content-Type: application/json" \
  -d '{
    "home_team": "Manchester United",
    "away_team": "Liverpool",
    "home_score": 0,
    "away_score": 0,
    "minute": 0,
    "status": "NOT_STARTED",
    "kickoff_time": '$(date +%s)'
  }'
```

### Start simulation
```bash
curl -s -X POST "http://localhost:3000/api/simulator/matches/<MATCH_ID>/start"
```

### Monitor match updates (watch command)
```bash
watch -n 1 'curl -s http://localhost:3000/api/matches/<MATCH_ID> | jq .'
```

---

## 4. SSE Stream Testing (`test-sse-stream.sh`)

### Connect to SSE stream
```bash
curl -N -H "Accept: text/event-stream" \
     "http://localhost:3000/api/matches/<MATCH_ID>/events/stream" 2>/dev/null
```

### Or use the script
```bash
./scripts/test-sse-stream.sh <MATCH_ID>
```

---

## 5. WebSocket Testing (`test-websocket.js`)

### Run WebSocket test script
```bash
node scripts/test-websocket.js <MATCH_ID>
```

### Or manually connect using socket.io-client
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000/matches', {
  transports: ['websocket']
});

socket.on('connect', () => {
  socket.emit('subscribe:match', { matchId: '<MATCH_ID>' });
});

socket.on('match:score_update', (data) => {
  console.log('Score update:', data);
});

socket.on('match:event', (data) => {
  console.log('Event:', data);
});

socket.on('match:stats_update', (data) => {
  console.log('Stats update:', data);
});
```

---

## 6. Docker Build Testing (`test-docker-build.sh`)

### Check if Docker is running
```bash
docker info
```

### Build Docker image
```bash
docker build -t profootball-app:test .
```

### Check image size
```bash
docker images profootball-app:test --format "{{.Size}}"
```

### Test image files
```bash
docker run --rm profootball-app:test ls -la dist/main.js
```

### Or run the script
```bash
./scripts/test-docker-build.sh
```

---

## 7. Manual Score Update (`update-match-score.sh`)

### Update match score (via database - requires direct DB access)
```sql
UPDATE matches 
SET home_score=<HOME_SCORE>, away_score=<AWAY_SCORE>, minute=<MINUTE> 
WHERE id='<MATCH_ID>';
```

### Or use the simulator to start automatic updates
```bash
curl -s -X POST "http://localhost:3000/api/simulator/matches/<MATCH_ID>/start"
```

---

## Quick Reference: All Scripts

### Run complete test suite
```bash
./scripts/test-all.sh
```

### Run basic API tests
```bash
./scripts/test-api.sh
```

### Run complete CRUD tests
```bash
./scripts/test-all-endpoints.sh
```

### Test SSE stream
```bash
./scripts/test-sse-stream.sh <MATCH_ID>
```

### Test WebSocket
```bash
node scripts/test-websocket.js <MATCH_ID>
```

### Test Docker build
```bash
./scripts/test-docker-build.sh
```

---

## Environment Variables

You can override the base URL:
```bash
export BASE_URL=http://localhost:3000
```

Or set it inline:
```bash
BASE_URL=http://localhost:3000 ./scripts/test-api.sh
```

---

## Notes

- Replace `<MATCH_ID>`, `<EVENT_ID>` with actual IDs from API responses
- All scripts assume server is running on `http://localhost:3000`
- Use `jq` for pretty JSON output (install with `brew install jq` on macOS)
- WebSocket tests require `socket.io-client` package
- SSE streams are long-lived connections - use Ctrl+C to stop

