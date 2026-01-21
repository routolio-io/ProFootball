# ⚽ ProFootball Backend

> A production-ready, real-time football match center backend built with NestJS. Features live match updates, chat rooms, match simulation, and comprehensive real-time communication capabilities.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue.svg)](https://supabase.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Real-Time Communication](#-real-time-communication)
- [Match Simulator](#-match-simulator)
- [Architecture](#-architecture)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## 🚀 Features

### Core Features

- **🏆 Real-Time Match Updates**
  - Live score updates via WebSocket and SSE
  - Real-time match events (goals, cards, substitutions)
  - Automatic statistics updates every 5 minutes
  - Match status transitions (NOT_STARTED → FIRST_HALF → HALF_TIME → SECOND_HALF → FULL_TIME)

- **💬 Per-Match Chat Rooms**
  - Match-specific chat rooms
  - Real-time messaging with typing indicators
  - User join/leave notifications
  - Rate limiting (5 messages per 30 seconds)
  - Message validation and sanitization

- **🎮 Intelligent Match Simulator**
  - Concurrent match simulation (multiple matches simultaneously)
  - Realistic event generation with probability-based distribution
  - Automatic time progression (1 real second = 1 match minute)
  - Realistic statistics generation
  - Start/stop simulation control

- **📡 Multiple Real-Time Protocols**
  - **WebSocket (Socket.IO)**: Full-duplex communication for match updates and chat
  - **Server-Sent Events (SSE)**: One-way event streaming with reconnection support
  - Room-based subscriptions for efficient broadcasting

- **🔌 Complete REST API**
  - Full CRUD operations for matches, events, and statistics
  - Consistent response format
  - Comprehensive input validation
  - Swagger/OpenAPI documentation

### Advanced Features

- **📊 Match Statistics**
  - Possession percentages
  - Shots and shots on target
  - Passes and pass completion rates
  - Fouls, corners, and offsides
  - Real-time statistics updates

- **🎯 Event Management**
  - Create, update, and delete match events
  - Automatic score recalculation on event changes
  - Event broadcasting to all subscribers
  - Support for multiple event types (GOAL, YELLOW_CARD, RED_CARD, SUBSTITUTION, FOUL, SHOT)

- **🔄 Connection Management**
  - Automatic connection cleanup on disconnect
  - Heartbeat/ping-pong for connection health
  - Reconnection support for SSE streams
  - Graceful error handling

- **🧪 Comprehensive Testing**
  - 55+ end-to-end tests
  - Testcontainers for isolated database testing
  - WebSocket and SSE stream testing
  - Performance and concurrent simulation tests

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | NestJS 11 with TypeScript 5.7 |
| **Database** | PostgreSQL (Supabase) via TypeORM |
| **Real-Time** | Socket.IO 4.8 for WebSocket communication |
| **Caching** | Redis (ioredis) for in-memory storage |
| **Streaming** | Server-Sent Events (SSE) for event streams |
| **Validation** | class-validator, class-transformer |
| **API Docs** | Swagger/OpenAPI 3.0 |
| **Testing** | Jest with Testcontainers |
| **Scheduling** | @nestjs/schedule for background tasks |

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** (for local Redis)
- **Supabase account** (for PostgreSQL database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ProFootball
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database (Supabase PostgreSQL)
   DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
   
   # Redis (local Docker)
   REDIS_URL=redis://localhost:6379
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # CORS (comma-separated list of allowed origins)
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Start Redis**
   ```bash
   docker-compose up -d redis
   ```

5. **Run database migrations**
   ```bash
   npm run migration:run
   ```

6. **Start the development server**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000/api`

### Verify Installation

1. **Check API health**
   ```bash
   curl http://localhost:3000/api
   ```

2. **Access Swagger UI**
   ```
   http://localhost:3000/api/docs
   ```

3. **Test a simple endpoint**
   ```bash
   curl http://localhost:3000/api/matches
   ```

## 📚 API Documentation

### Swagger UI

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:3000/api/docs

### REST Endpoints

#### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/matches` | Get all matches |
| `GET` | `/api/matches/:id` | Get match details with events and statistics |
| `POST` | `/api/matches` | Create a new match |
| `PUT` | `/api/matches/:id` | Update a match |
| `DELETE` | `/api/matches/:id` | Delete a match |

#### Match Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/matches/:id/events` | Create a match event |
| `PUT` | `/api/matches/:id/events/:eventId` | Update a match event |
| `DELETE` | `/api/matches/:id/events/:eventId` | Delete a match event |

#### Match Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/matches/:id/statistics` | Create or update match statistics |
| `PUT` | `/api/matches/:id/statistics` | Update match statistics |

#### Match Events Stream (SSE)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/matches/:id/events/stream` | Server-Sent Events stream for match updates |

#### Simulator

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/simulator/matches/:id/start` | Start simulating a match |
| `DELETE` | `/api/simulator/matches/:id/stop` | Stop simulating a match |
| `POST` | `/api/simulator/matches/start-multiple` | Start simulating up to 5 NOT_STARTED matches |

### Response Format

All REST endpoints return responses in a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": null
}
```

**Error Response:**
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Match not found",
  "data": null
}
```

### Example Requests

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

**Start match simulation:**
```bash
curl -X POST http://localhost:3000/api/simulator/matches/{MATCH_ID}/start
```

**Start multiple matches:**
```bash
curl -X POST http://localhost:3000/api/simulator/matches/start-multiple
```

For complete API testing examples, see [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md).

## 🔌 Real-Time Communication

### WebSocket (Socket.IO)

The application uses Socket.IO for bidirectional real-time communication.

#### Connection

Connect to Socket.IO namespaces:
- **Matches**: `ws://localhost:3000/matches`
- **Chat**: `ws://localhost:3000/chat`

#### Client → Server Events

**Matches Namespace (`/matches`)**

- `subscribe:match` - Subscribe to match updates
- `unsubscribe:match` - Unsubscribe from match updates
- `ping` - Heartbeat to keep connection alive

**Chat Namespace (`/chat`)**

- `join:chat` - Join a chat room for a specific match
- `leave:chat` - Leave a chat room
- `send:message` - Send a message to the chat room
- `typing:start` - Indicate that you're typing
- `typing:stop` - Stop typing indicator
- `ping` - Heartbeat

#### Server → Client Events

**Matches Namespace**

- `match:score_update` - Match score changes
- `match:event` - Match events (goals, cards, substitutions, etc.)
- `match:stats_update` - Statistics updates
- `match:status_update` - Match status changes
- `subscribed:match` - Subscription confirmation
- `unsubscribed:match` - Unsubscription confirmation

**Chat Namespace**

- `chat:message` - New message in chat room
- `chat:user_joined` - User joined the chat room
- `chat:user_left` - User left the chat room
- `chat:typing` - User is typing
- `chat:typing_stopped` - User stopped typing
- `joined:chat` - Join confirmation
- `left:chat` - Leave confirmation

#### Example Client Code

```typescript
import { io } from 'socket.io-client';

// Connect to matches namespace
const matchesSocket = io('http://localhost:3000/matches', {
  transports: ['websocket'],
});

const matchId = '123e4567-e89b-12d3-a456-426614174000';

// Subscribe to match updates
matchesSocket.on('connect', () => {
  matchesSocket.emit('subscribe:match', { matchId });
});

// Listen for score updates
matchesSocket.on('match:score_update', (data) => {
  console.log(`Score: ${data.homeScore}-${data.awayScore} (${data.minute}')`);
});

// Listen for match events
matchesSocket.on('match:event', (data) => {
  if (data.event.type === 'GOAL') {
    console.log(`Goal! ${data.event.player} (${data.event.minute}')`);
  }
});

// Heartbeat
setInterval(() => {
  matchesSocket.emit('ping');
}, 30000);
```

For complete Socket.IO event documentation, see [SOCKET_IO_EVENTS.md](./SOCKET_IO_EVENTS.md) (if available) or the Swagger documentation.

### Server-Sent Events (SSE)

SSE provides one-way event streaming with automatic reconnection support.

#### Endpoint

```
GET /api/matches/:id/events/stream
```

#### Event Types

- `score_update` - Match score changes
- `match_event` - Match events (goals, cards, etc.)
- `stats_update` - Statistics updates
- `status_update` - Match status changes

#### Example Client Code

```javascript
const eventSource = new EventSource(
  'http://localhost:3000/api/matches/{matchId}/events/stream'
);

eventSource.addEventListener('score_update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Score update:', data);
});

eventSource.addEventListener('match_event', (event) => {
  const data = JSON.parse(event.data);
  console.log('Match event:', data);
});

eventSource.addEventListener('stats_update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Stats update:', data);
});

// Handle errors
eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

#### Reconnection Support

The SSE stream supports the `Last-Event-ID` header for reconnection:

```bash
curl -N -H "Last-Event-ID: {event-id}" \
  http://localhost:3000/api/matches/{matchId}/events/stream
```

## 🎮 Match Simulator

The match simulator automatically progresses matches and generates realistic events.

### Features

- **Time Progression**: 1 real second = 1 match minute
- **Event Generation**: Goals, cards, substitutions, fouls, shots based on realistic probabilities
- **Statistics Updates**: Automatic statistics updates every 5 simulated minutes
- **Lifecycle Management**: Handles match states (NOT_STARTED → FIRST_HALF → HALF_TIME → SECOND_HALF → FULL_TIME)
- **Concurrent Simulation**: Supports multiple matches running simultaneously

### Event Probabilities

- **Goals**: ~2.5 per match (higher probability in second half)
- **Yellow Cards**: ~3-4 per match
- **Red Cards**: Rare (~0.002 per minute)
- **Substitutions**: 3-5 per team (typically after 60')
- **Fouls**: Every 2-3 minutes
- **Shots**: Every 3-5 minutes

### Starting a Simulation

**Start a specific match:**
```bash
POST /api/simulator/matches/{matchId}/start
```

**Start multiple matches (finds and starts up to 5 NOT_STARTED matches):**
```bash
POST /api/simulator/matches/start-multiple
```

**Stop simulation:**
```bash
DELETE /api/simulator/matches/{matchId}/stop
```

### Example Workflow

```bash
# 1. Create a match
MATCH_ID=$(curl -s -X POST http://localhost:3000/api/matches \
  -H "Content-Type: application/json" \
  -d '{"home_team":"Arsenal","away_team":"Chelsea","kickoff_time":'$(date +%s)'}' \
  | jq -r '.data.id')

# 2. Start simulation
curl -X POST http://localhost:3000/api/simulator/matches/${MATCH_ID}/start

# 3. Watch updates via WebSocket or SSE
# (See Real-Time Communication section above)
```

## 🏗️ Architecture

### Domain-Driven Design

The application follows NestJS domain-driven design principles:

```
src/
├── domains/
│   ├── matches/        # Match domain
│   │   ├── entities/   # Match, MatchEvent, MatchStatistics
│   │   ├── dto/        # Data Transfer Objects
│   │   ├── matches.controller.ts
│   │   ├── matches.service.ts
│   │   ├── matches.gateway.ts
│   │   └── events-stream.controller.ts
│   ├── chat/          # Chat domain
│   │   ├── entities/
│   │   ├── dto/
│   │   ├── chat.service.ts
│   │   └── chat.gateway.ts
│   └── simulator/     # Match simulator domain
│       ├── match-simulator.service.ts
│       ├── event-generator.service.ts
│       └── simulator.controller.ts
├── common/            # Shared utilities
│   ├── base-entity.ts
│   ├── dto/
│   ├── filters/
│   └── interceptors/
├── providers/         # External service providers
│   ├── redis.provider.ts
│   └── socket-io.adapter.ts
└── config/           # Configuration
    └── database.config.ts
```

### Key Components

- **Gateways**: Socket.IO gateways for real-time communication
- **Services**: Business logic layer
- **Controllers**: REST API endpoints
- **Entities**: TypeORM database entities
- **DTOs**: Data transfer objects for validation

### Database Schema

- `matches` - Match information (teams, scores, status, minute)
- `match_events` - Match events (goals, cards, substitutions, etc.)
- `match_statistics` - Match statistics (possession, shots, passes, etc.)
- `chat_messages` - Chat messages per match

### Real-Time Architecture

- **Socket.IO**: Room-based subscriptions for efficient broadcasting
- **SSE**: RxJS Observables for event streaming
- **Redis**: In-memory storage for connection state (scalable to multiple instances)

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Test Coverage

- ✅ 55+ end-to-end tests covering all major features
- ✅ Match REST endpoints
- ✅ Socket.IO gateways (matches and chat)
- ✅ SSE endpoints
- ✅ Simulator endpoints
- ✅ Concurrent match simulation
- ✅ Performance testing

### Test Structure

```
test/
├── e2e/
│   ├── matches.controller.e2e-spec.ts
│   ├── matches.gateway.e2e-spec.ts
│   ├── chat.gateway.e2e-spec.ts
│   ├── events-stream.controller.e2e-spec.ts
│   └── simulator.controller.e2e-spec.ts
└── setup/
    ├── db.ts              # Testcontainers setup
    ├── db-cleanup.ts      # Database cleanup
    └── e2e-app.ts         # Test app factory
```

For detailed testing instructions, see [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md).

## 🚀 Deployment

### Environment Variables

Set the following environment variables in production:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.com
```

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Docker Deployment

The project includes Docker configuration:

```bash
# Build Docker image
docker build -t profootball-app .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Platform-Specific Deployment

- **Railway**: Automatic detection, set environment variables
- **Heroku**: Requires Procfile, set environment variables
- **AWS (EC2/ECS)**: Use Docker image, configure RDS and ElastiCache
- **DigitalOcean**: App Platform supports Node.js apps

## 📖 Additional Documentation

- [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md) - Complete API testing guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [MODULE_SETUP_STANDARD.md](./MODULE_SETUP_STANDARD.md) - Code standards and patterns (for contributors)

## 🤝 Contributing

1. Follow the code standards in `MODULE_SETUP_STANDARD.md`
2. Write tests for new features
3. Ensure all tests pass before submitting
4. Update documentation as needed

## 📝 License

This project is private and proprietary.

## ✅ Success Criteria

- ✅ All REST endpoints working correctly
- ✅ Real-time updates via Socket.IO functional
- ✅ SSE stream working for match events
- ✅ Match simulator running with realistic events
- ✅ Chat rooms functional with all features
- ✅ Proper error handling throughout
- ✅ Connection cleanup working
- ✅ Rate limiting enforced
- ✅ Code follows NestJS best practices
- ✅ Comprehensive test coverage (55+ tests)

---

**Built with ❤️ using NestJS, TypeScript, and Socket.IO**
