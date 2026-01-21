# Socket.IO Events Documentation

Complete reference for all Socket.IO events in the ProFootball backend.

## Connection

### Namespaces

- **Matches**: `/matches` - Real-time match updates
- **Chat**: `/chat` - Chat room functionality

### Connection URL

```
ws://localhost:3000/matches
ws://localhost:3000/chat
```

## Matches Namespace (`/matches`)

### Client → Server Events

#### `subscribe:match`

Subscribe to real-time updates for a specific match.

**Payload:**
```typescript
{
  matchId: string  // UUID of the match
}
```

**Response:** `subscribed:match`
```typescript
{
  matchId: string,
  room: string  // e.g., "match:123e4567-e89b-12d3-a456-426614174000"
}
```

**Example:**
```javascript
socket.emit('subscribe:match', { matchId: '123e4567-e89b-12d3-a456-426614174000' });
```

---

#### `unsubscribe:match`

Unsubscribe from match updates.

**Payload:**
```typescript
{
  matchId: string
}
```

**Response:** `unsubscribed:match`
```typescript
{
  matchId: string
}
```

---

#### `ping`

Send heartbeat to keep connection alive. Should be sent every 30 seconds.

**Payload:** Optional (any value)

**Response:** `pong`
```typescript
{
  ts: number,      // Timestamp when pong was sent
  echo: unknown   // Echo of the ping payload (or null)
}
```

**Example:**
```javascript
setInterval(() => {
  socket.emit('ping');
}, 30000);
```

---

### Server → Client Events

#### `match:score_update`

Emitted when match score changes.

**Payload:**
```typescript
{
  matchId: string,
  homeScore: number,
  awayScore: number,
  minute: number
}
```

**Example:**
```javascript
socket.on('match:score_update', (data) => {
  console.log(`Match ${data.matchId}: ${data.homeScore}-${data.awayScore} (${data.minute}')`);
});
```

---

#### `match:event`

Emitted when a match event occurs (goal, card, substitution, etc.).

**Payload:**
```typescript
{
  matchId: string,
  event: {
    id: string,  // Event UUID
    type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'FOUL' | 'SHOT',
    minute: number,
    team: 'HOME' | 'AWAY',
    player?: string,
    description: string
  }
}
```

**Event Types:**
- `GOAL` - Goal scored
- `YELLOW_CARD` - Yellow card shown
- `RED_CARD` - Red card shown
- `SUBSTITUTION` - Player substitution
- `FOUL` - Foul committed
- `SHOT` - Shot taken

**Example:**
```javascript
socket.on('match:event', (data) => {
  if (data.event.type === 'GOAL') {
    console.log(`Goal! ${data.event.player} (${data.event.minute}')`);
  }
});
```

---

#### `match:stats_update`

Emitted when match statistics are updated (typically every 5 minutes).

**Payload:**
```typescript
{
  matchId: string,
  statistics: {
    homePossession: number,        // 0-100
    awayPossession: number,        // 0-100
    homeShots: number,
    awayShots: number,
    homeShotsOnTarget: number,
    awayShotsOnTarget: number,
    homePasses: number,
    awayPasses: number,
    homePassesCompleted: number,
    awayPassesCompleted: number,
    homeFouls: number,
    awayFouls: number,
    homeCorners: number,
    awayCorners: number,
    homeOffsides: number,
    awayOffsides: number
  }
}
```

**Example:**
```javascript
socket.on('match:stats_update', (data) => {
  console.log(`Possession: ${data.statistics.homePossession}% - ${data.statistics.awayPossession}%`);
});
```

---

#### `subscribed:match`

Confirmation that subscription was successful.

**Payload:**
```typescript
{
  matchId: string,
  room: string
}
```

---

#### `unsubscribed:match`

Confirmation that unsubscription was successful.

**Payload:**
```typescript
{
  matchId: string,
  room: string  // e.g., "match:123e4567-e89b-12d3-a456-426614174000"
}
```

---

#### `match:status_update`

Emitted when match status changes (NOT_STARTED → FIRST_HALF → HALF_TIME → SECOND_HALF → FULL_TIME).

**Payload:**
```typescript
{
  matchId: string,
  status: string,  // 'NOT_STARTED' | 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FULL_TIME'
  minute: number
}
```

**Example:**
```javascript
socket.on('match:status_update', (data) => {
  console.log(`Match ${data.matchId} status: ${data.status} at minute ${data.minute}`);
});
```

---

#### `error`

Error event for various error conditions.

**Payload:**
```typescript
{
  code: string,  // Error code
  message: string
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Invalid payload
- `SUBSCRIPTION_ERROR` - Failed to subscribe
- `UNSUBSCRIPTION_ERROR` - Failed to unsubscribe

---

## Chat Namespace (`/chat`)

### Client → Server Events

#### `join:chat`

Join a chat room for a specific match.

**Payload:**
```typescript
{
  matchId: string,
  userId?: string,     // Optional user ID
  username?: string    // Optional display name
}
```

**Response:** `joined:chat`
```typescript
{
  matchId: string,
  room: string,
  userId: string,
  username: string,
  userCount: number
}
```

**Example:**
```javascript
socket.emit('join:chat', {
  matchId: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  username: 'John Doe'
});
```

---

#### `leave:chat`

Leave a chat room.

**Payload:**
```typescript
{
  matchId: string
}
```

---

#### `send:message`

Send a message to the chat room.

**Payload:**
```typescript
{
  matchId: string,
  message: string,     // 1-500 characters
  userId?: string,
  username?: string
}
```

**Rate Limit:** 5 messages per 30 seconds per user per room

**Response:** `chat:message` (broadcasted to all room members)

**Error:** `error` event with code `RATE_LIMIT_EXCEEDED` if rate limit exceeded

**Example:**
```javascript
socket.emit('send:message', {
  matchId: '123e4567-e89b-12d3-a456-426614174000',
  message: 'Great goal!',
  userId: 'user-123',
  username: 'John Doe'
});
```

---

#### `typing:start`

Indicate that you're typing a message.

**Payload:**
```typescript
{
  matchId: string,
  userId?: string,
  username?: string
}
```

**Example:**
```javascript
socket.emit('typing:start', {
  matchId: '123e4567-e89b-12d3-a456-426614174000',
  username: 'John Doe'
});
```

---

#### `typing:stop`

Stop typing indicator.

**Payload:**
```typescript
{
  matchId: string,
  userId?: string
}
```

---

#### `ping`

Send heartbeat (same as matches namespace).

---

### Server → Client Events

#### `chat:message`

New message in the chat room.

**Payload:**
```typescript
{
  matchId: string,
  message: {
    id: string,           // Message UUID
    content: string,
    userId?: string,
    username: string,
    timestamp: number     // Unix timestamp
  }
}
```

**Example:**
```javascript
socket.on('chat:message', (data) => {
  console.log(`${data.message.username}: ${data.message.content}`);
});
```

---

#### `chat:user_joined`

User joined the chat room (broadcasted to other users).

**Payload:**
```typescript
{
  matchId: string,
  userId?: string,
  username: string,
  userCount: number
}
```

---

#### `chat:user_left`

User left the chat room (broadcasted to other users).

**Payload:**
```typescript
{
  matchId: string,
  userId?: string,
  username: string,
  userCount: number
}
```

---

#### `chat:typing`

User is typing (broadcasted to other users).

**Payload:**
```typescript
{
  matchId: string,
  userId?: string,
  username: string
}
```

**Note:** Typing indicators expire after 5 seconds automatically.

---

#### `chat:typing_stopped`

User stopped typing (broadcasted to other users).

**Payload:**
```typescript
{
  matchId: string,
  userId?: string
}
```

---

#### `joined:chat`

Confirmation that you've joined the chat room.

**Payload:**
```typescript
{
  matchId: string,
  room: string,
  userId: string,
  username: string,
  userCount: number
}
```

---

#### `left:chat`

Confirmation that you've left the chat room.

**Payload:**
```typescript
{
  matchId: string,
  room: string
}
```

---

#### `pong`

Response to `ping` heartbeat.

**Payload:**
```typescript
{
  ts: number,      // Timestamp when pong was sent
  echo: unknown   // Echo of the ping payload (or null)
}
```

---

#### `error`

Error event for various error conditions.

**Payload:**
```typescript
{
  code: string,
  message: string
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Invalid payload
- `RATE_LIMIT_EXCEEDED` - Too many messages sent (5 messages per 30 seconds)
- `JOIN_CHAT_ERROR` - Failed to join chat room
- `LEAVE_CHAT_ERROR` - Failed to leave chat room
- `SEND_MESSAGE_ERROR` - Failed to send message
- `MESSAGE_TOO_LONG` - Message exceeds 500 characters
- `MESSAGE_EMPTY` - Message is empty

---

## Complete Example

### JavaScript/TypeScript Client

```typescript
import { io, Socket } from 'socket.io-client';

// Connect to matches namespace
const matchesSocket = io('http://localhost:3000/matches', {
  transports: ['websocket'],
});

// Connect to chat namespace
const chatSocket = io('http://localhost:3000/chat', {
  transports: ['websocket'],
});

const matchId = '123e4567-e89b-12d3-a456-426614174000';

// Subscribe to match updates
matchesSocket.on('connect', () => {
  matchesSocket.emit('subscribe:match', { matchId });
});

// Listen for score updates
matchesSocket.on('match:score_update', (data) => {
  console.log('Score:', data);
});

// Listen for match events
matchesSocket.on('match:event', (data) => {
  console.log('Event:', data.event);
});

// Join chat room
chatSocket.on('connect', () => {
  chatSocket.emit('join:chat', {
    matchId,
    userId: 'user-123',
    username: 'John Doe',
  });
});

// Listen for messages
chatSocket.on('chat:message', (data) => {
  console.log(`${data.message.username}: ${data.message.content}`);
});

// Send a message
chatSocket.emit('send:message', {
  matchId,
  message: 'Hello!',
  userId: 'user-123',
  username: 'John Doe',
});

// Heartbeat
setInterval(() => {
  matchesSocket.emit('ping');
  chatSocket.emit('ping');
}, 30000);
```

---

## Error Handling

Always listen for error events:

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.code, error.message);
  
  switch (error.code) {
    case 'RATE_LIMIT_EXCEEDED':
      // Wait before sending more messages
      break;
    case 'VALIDATION_ERROR':
      // Fix payload format
      break;
    default:
      // Handle other errors
  }
});
```

---

## Best Practices

1. **Always send heartbeats** - Use `ping` every 30 seconds to keep connections alive
2. **Handle errors** - Listen for `error` events and handle them appropriately
3. **Validate payloads** - Ensure payloads match the expected format
4. **Respect rate limits** - Don't exceed 5 messages per 30 seconds in chat
5. **Clean up** - Unsubscribe and leave rooms when done
6. **Reconnection** - Handle disconnections and reconnect automatically

