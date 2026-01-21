# API Testing Guide

Complete guide for testing all ProFootball API endpoints locally.

## Prerequisites

1. **Start the server:**
   ```bash
   npm run start:dev
   ```

2. **Start Redis (if not running):**
   ```bash
   docker-compose up -d redis
   ```

3. **Ensure database is set up:**
   ```bash
   npm run migration:run
   ```

## Quick Start - Complete Test Suite

Run the comprehensive test script:

```bash
./scripts/test-all.sh
```

This will:
1. ✅ Test all REST endpoints
2. ✅ Create a test match
3. ✅ Start match simulation
4. ✅ Provide instructions for real-time testing

## Testing Individual Components

### 1. REST API Endpoints

#### Test all REST endpoints:
```bash
./scripts/test-api.sh
```

#### Manual testing with curl:

**Create a match:**
```bash
curl -X POST http://localhost:3000/api/matches \
  -H "Content-Type: application/json" \
  -d '{
    "home_team": "Arsenal",
    "away_team": "Chelsea",
    "home_score": 0,
    "away_score": 0,
    "minute": 0,
    "status": "NOT_STARTED",
    "kickoff_time": 1704067200
  }'
```

**Get all matches:**
```bash
curl http://localhost:3000/api/matches | jq
```

**Get match by ID:**
```bash
curl http://localhost:3000/api/matches/{MATCH_ID} | jq
```

**Start simulation:**
```bash
curl -X POST http://localhost:3000/api/simulator/matches/{MATCH_ID}/start | jq
```

**Stop simulation:**
```bash
curl -X DELETE http://localhost:3000/api/simulator/matches/{MATCH_ID}/stop | jq
```

**Start multiple matches (finds and starts up to 5 NOT_STARTED matches):**
```bash
curl -X POST http://localhost:3000/api/simulator/matches/start-multiple | jq
```

### 2. Swagger UI Testing

Open Swagger UI in your browser:
```
http://localhost:3000/api/docs
```

Features:
- ✅ Interactive API testing
- ✅ View all endpoints
- ✅ See request/response schemas
- ✅ Test endpoints directly from browser
- ✅ View authentication requirements

### 3. WebSocket Testing

#### Test WebSocket connections:

```bash
node scripts/test-websocket.js {MATCH_ID}
```

This script will:
- Connect to `/matches` namespace
- Subscribe to match updates
- Display score updates in real-time
- Display match events (goals, cards, etc.)
- Display statistics updates

**Example:**
```bash
# First, create a match and get its ID
MATCH_ID=$(curl -s -X POST http://localhost:3000/api/matches \
  -H "Content-Type: application/json" \
  -d '{"home_team":"Arsenal","away_team":"Chelsea","kickoff_time":'$(date +%s)'}' \
  | jq -r '.data.id')

# Start simulation
curl -X POST http://localhost:3000/api/simulator/matches/${MATCH_ID}/start

# Test WebSocket (in another terminal)
node scripts/test-websocket.js ${MATCH_ID}
```

### 4. SSE Stream Testing

#### Test SSE stream:

```bash
./scripts/test-sse-stream.sh {MATCH_ID}
```

Or manually:
```bash
curl -N -H "Accept: text/event-stream" \
  http://localhost:3000/api/matches/{MATCH_ID}/events/stream
```

**In browser:**
```javascript
const eventSource = new EventSource('http://localhost:3000/api/matches/{MATCH_ID}/events/stream');

eventSource.addEventListener('score_update', (event) => {
  console.log('Score update:', JSON.parse(event.data));
});

eventSource.addEventListener('match_event', (event) => {
  console.log('Match event:', JSON.parse(event.data));
});

eventSource.addEventListener('stats_update', (event) => {
  console.log('Stats update:', JSON.parse(event.data));
});
```

### 5. Real-Time Update Testing

#### Complete Real-Time Test Flow:

**Terminal 1: Start server and create match**
```bash
npm run start:dev
# In another terminal:
MATCH_ID=$(curl -s -X POST http://localhost:3000/api/matches \
  -H "Content-Type: application/json" \
  -d '{"home_team":"Arsenal","away_team":"Chelsea","kickoff_time":'$(date +%s)'}' \
  | jq -r '.data.id')
echo "Match ID: $MATCH_ID"
```

**Terminal 2: Start simulation**
```bash
curl -X POST http://localhost:3000/api/simulator/matches/${MATCH_ID}/start
```

**Terminal 3: Watch WebSocket updates**
```bash
node scripts/test-websocket.js ${MATCH_ID}
```

**Terminal 4: Watch SSE stream**
```bash
./scripts/test-sse-stream.sh ${MATCH_ID}
```

**Terminal 5: Monitor match via REST**
```bash
watch -n 1 'curl -s http://localhost:3000/api/matches/${MATCH_ID} | jq .data | jq "{home_team, away_team, home_score, away_score, minute, status}"'
```

### 6. Chat Testing

Chat functionality is available via WebSocket on `/chat` namespace.

**Test chat with Node.js:**
```javascript
const io = require('socket.io-client');

const chatSocket = io('http://localhost:3000/chat', {
  transports: ['websocket'],
});

chatSocket.on('connect', () => {
  console.log('Connected to chat');
  
  // Join chat room
  chatSocket.emit('join:chat', {
    matchId: 'YOUR_MATCH_ID',
    userId: 'user-123',
    username: 'TestUser',
  });
});

chatSocket.on('joined:chat', (data) => {
  console.log('Joined chat:', data);
  
  // Send a message
  chatSocket.emit('send:message', {
    matchId: 'YOUR_MATCH_ID',
    message: 'Hello from test!',
    userId: 'user-123',
    username: 'TestUser',
  });
});

chatSocket.on('chat:message', (data) => {
  console.log('New message:', data.message);
});

chatSocket.on('chat:user_joined', (data) => {
  console.log('User joined:', data);
});

chatSocket.on('error', (error) => {
  console.error('Error:', error);
});
```

## Testing Checklist

### REST API
- [ ] Create match (POST /api/matches)
- [ ] Get all matches (GET /api/matches)
- [ ] Get match by ID (GET /api/matches/:id)
- [ ] Start simulation (POST /api/simulator/matches/:id/start)
- [ ] Stop simulation (DELETE /api/simulator/matches/:id/stop)
- [ ] Start multiple matches (POST /api/simulator/matches/start-multiple)

### WebSocket
- [ ] Connect to /matches namespace
- [ ] Subscribe to match updates
- [ ] Receive score updates
- [ ] Receive match events
- [ ] Receive statistics updates
- [ ] Connect to /chat namespace
- [ ] Join chat room
- [ ] Send messages
- [ ] Receive messages
- [ ] Typing indicators

### SSE
- [ ] Connect to SSE stream
- [ ] Receive score_update events
- [ ] Receive match_event events
- [ ] Receive stats_update events
- [ ] Handle reconnection

### Real-Time Updates
- [ ] Start simulation
- [ ] Verify score updates appear in WebSocket
- [ ] Verify score updates appear in SSE
- [ ] Verify match events are broadcast
- [ ] Verify statistics updates are broadcast
- [ ] Verify updates happen in real-time (1 second = 1 minute)

## Common Issues

### Server not running
```bash
npm run start:dev
```

### Redis not running
```bash
docker-compose up -d redis
```

### Database connection issues
- Check DATABASE_URL in .env
- Verify database is accessible
- Run migrations: `npm run migration:run`

### WebSocket connection fails
- Check CORS settings
- Verify server is running
- Check firewall settings

### No updates received
- Verify match simulation is started
- Check WebSocket/SSE connection is active
- Verify subscription was successful
- Check server logs for errors

## Performance Testing

### Monitor match updates:
```bash
# Watch match every second
watch -n 1 'curl -s http://localhost:3000/api/matches/{MATCH_ID} | jq .data'
```

### Test multiple concurrent connections:
```bash
# Run multiple WebSocket clients
for i in {1..10}; do
  node scripts/test-websocket.js ${MATCH_ID} &
done
```

## Next Steps

1. ✅ Test all endpoints via Swagger UI
2. ✅ Test WebSocket connections
3. ✅ Test SSE streams
4. ✅ Verify real-time updates work
5. ✅ Test chat functionality
6. ✅ Monitor performance under load

