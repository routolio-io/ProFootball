import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisProvider } from '../../providers/redis.provider';
import { ChatService } from './chat.service';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
    ],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @Inject(RedisProvider) private readonly redisProvider: RedisProvider,
    private readonly chatService: ChatService,
  ) {}

  private get redis(): Redis {
    return this.redisProvider.getClient();
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    try {
      // Track socket connection in Redis
      const socketKey = `socket:${client.id}`;
      const now = Date.now();

      // Store socket metadata
      await this.redis.hset(socketKey, {
        connected_at: now.toString(),
        last_ping: now.toString(),
        namespace: '/chat',
      });

      // Set expiration for socket key (24 hours)
      await this.redis.expire(socketKey, 86400);

      this.logger.debug(`Tracked socket ${client.id} in Redis`);
    } catch (error) {
      this.logger.error(`Failed to track socket ${client.id} in Redis:`, error);
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    try {
      // Get all chat rooms this socket was in
      const roomsKey = `socket:${client.id}:rooms`;
      const roomIds = await this.redis.smembers(roomsKey);

      // Get user info before cleanup
      const userInfo = await this.redis.hgetall(`socket:${client.id}`);
      const userIdentifier = userInfo.user_id || client.id;
      const displayUsername =
        userInfo.username || `User_${client.id.slice(0, 8)}`;

      // Remove user from each room's user set and notify others
      for (const roomId of roomIds) {
        const usersKey = `chat:room:${roomId}:users`;
        await this.redis.srem(usersKey, userIdentifier);

        // Get updated user count
        const userCount = await this.redis.scard(usersKey);

        // Broadcast user left notification
        this.server.to(`chat:${roomId}`).emit('chat:user_left', {
          matchId: roomId,
          userId: userIdentifier,
          username: displayUsername,
          userCount,
        });
      }

      // Clean up socket tracking keys
      await this.redis.del(`socket:${client.id}`);
      await this.redis.del(roomsKey);

      this.logger.debug(`Cleaned up socket ${client.id} from Redis`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup socket ${client.id} from Redis:`,
        error,
      );
    }
  }

  @SubscribeMessage('ping')
  async handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload?: unknown,
  ) {
    try {
      // Update last ping time in Redis
      await this.redis.hset(`socket:${client.id}`, {
        last_ping: Date.now().toString(),
      });

      client.emit('pong', {
        ts: Date.now(),
        echo: payload ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update ping for socket ${client.id}:`,
        error,
      );
      // Still send pong even if Redis update fails
      client.emit('pong', {
        ts: Date.now(),
        echo: payload ?? null,
      });
    }
  }

  @SubscribeMessage('join:chat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { matchId: string; userId?: string; username?: string },
  ) {
    try {
      const { matchId, userId, username } = payload;

      if (!matchId || typeof matchId !== 'string') {
        client.emit('error', {
          code: 'VALIDATION_ERROR',
          message: 'matchId is required and must be a string',
        });
        return;
      }

      // Join Socket.IO room for chat
      const roomName = `chat:${matchId}`;
      await client.join(roomName);

      // Track user in Redis
      const usersKey = `chat:room:${matchId}:users`;
      const socketRoomsKey = `socket:${client.id}:rooms`;

      // Use socket ID as user identifier (supports anonymous users)
      const userIdentifier = userId || client.id;
      const displayUsername = username || `User_${client.id.slice(0, 8)}`;

      await this.redis.sadd(usersKey, userIdentifier);
      await this.redis.sadd(socketRoomsKey, matchId);

      // Store user info
      await this.redis.hset(`socket:${client.id}`, {
        user_id: userIdentifier,
        username: displayUsername,
        last_ping: Date.now().toString(),
      });

      // Get current user count
      const userCount = await this.redis.scard(usersKey);

      // Broadcast user joined notification to room (excluding sender)
      client.to(roomName).emit('chat:user_joined', {
        matchId,
        userId: userIdentifier,
        username: displayUsername,
        userCount,
      });

      // Emit confirmation to the joining client
      client.emit('joined:chat', {
        matchId,
        room: roomName,
        userId: userIdentifier,
        username: displayUsername,
        userCount,
      });

      this.logger.debug(
        `Socket ${client.id} joined chat room for match ${matchId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to join socket ${client.id} to chat room:`,
        error,
      );
      client.emit('error', {
        code: 'JOIN_CHAT_ERROR',
        message: 'Failed to join chat room',
      });
    }
  }

  @SubscribeMessage('leave:chat')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { matchId: string },
  ) {
    try {
      const { matchId } = payload;

      if (!matchId || typeof matchId !== 'string') {
        client.emit('error', {
          code: 'VALIDATION_ERROR',
          message: 'matchId is required and must be a string',
        });
        return;
      }

      // Leave Socket.IO room
      const roomName = `chat:${matchId}`;
      await client.leave(roomName);

      // Get user info before removing
      const userInfo = await this.redis.hgetall(`socket:${client.id}`);
      const userIdentifier = userInfo.user_id || client.id;
      const displayUsername =
        userInfo.username || `User_${client.id.slice(0, 8)}`;

      // Remove from Redis tracking
      const usersKey = `chat:room:${matchId}:users`;
      const socketRoomsKey = `socket:${client.id}:rooms`;

      await this.redis.srem(usersKey, userIdentifier);
      await this.redis.srem(socketRoomsKey, matchId);

      // Get updated user count
      const userCount = await this.redis.scard(usersKey);

      // Broadcast user left notification to room
      client.to(roomName).emit('chat:user_left', {
        matchId,
        userId: userIdentifier,
        username: displayUsername,
        userCount,
      });

      // Emit confirmation
      client.emit('left:chat', {
        matchId,
        room: roomName,
      });

      this.logger.debug(
        `Socket ${client.id} left chat room for match ${matchId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to leave socket ${client.id} from chat room:`,
        error,
      );
      client.emit('error', {
        code: 'LEAVE_CHAT_ERROR',
        message: 'Failed to leave chat room',
      });
    }
  }

  @SubscribeMessage('send:message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      matchId: string;
      message: string;
      userId?: string;
      username?: string;
    },
  ) {
    try {
      const { matchId, message, userId, username } = payload;

      // Validation
      if (!matchId || typeof matchId !== 'string') {
        client.emit('error', {
          code: 'VALIDATION_ERROR',
          message: 'matchId is required and must be a string',
        });
        return;
      }

      if (!message || typeof message !== 'string') {
        client.emit('error', {
          code: 'VALIDATION_ERROR',
          message: 'message is required and must be a string',
        });
        return;
      }

      // Trim and validate message length
      const trimmedMessage = message.trim();
      if (trimmedMessage.length === 0) {
        client.emit('error', {
          code: 'VALIDATION_ERROR',
          message: 'message cannot be empty',
        });
        return;
      }

      if (trimmedMessage.length > 500) {
        client.emit('error', {
          code: 'VALIDATION_ERROR',
          message: 'message cannot exceed 500 characters',
        });
        return;
      }

      // Get user info
      const userInfo = await this.redis.hgetall(`socket:${client.id}`);
      const userIdentifier = userId || userInfo.user_id || client.id;
      const displayUsername =
        username || userInfo.username || `User_${client.id.slice(0, 8)}`;

      // Rate limiting: 5 messages per 30 seconds per user per room
      const rateLimitKey = `chat:rate:${userIdentifier}:${matchId}`;
      const currentCount = await this.redis.get(rateLimitKey);

      if (currentCount && parseInt(currentCount, 10) >= 5) {
        client.emit('error', {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded: 5 messages per 30 seconds',
        });
        return;
      }

      // Increment rate limit counter
      if (currentCount) {
        await this.redis.incr(rateLimitKey);
      } else {
        await this.redis.set(rateLimitKey, '1', 'EX', 30);
      }

      // Store message in database
      const chatMessage = await this.chatService.createMessage(
        matchId,
        userIdentifier,
        displayUsername,
        trimmedMessage,
      );

      // Broadcast message to room members
      const roomName = `chat:${matchId}`;
      this.server.to(roomName).emit('chat:message', {
        matchId,
        message: {
          id: chatMessage.id,
          content: trimmedMessage,
          userId: userIdentifier,
          username: displayUsername,
          timestamp: chatMessage.created_at,
        },
      });

      this.logger.debug(
        `Socket ${client.id} sent message in chat room for match ${matchId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send message from socket ${client.id}:`,
        error,
      );
      client.emit('error', {
        code: 'SEND_MESSAGE_ERROR',
        message: 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { matchId: string; userId?: string; username?: string },
  ) {
    try {
      const { matchId, userId, username } = payload;

      if (!matchId || typeof matchId !== 'string') {
        return; // Silently ignore invalid requests for typing indicators
      }

      // Get user info
      const userInfo = await this.redis.hgetall(`socket:${client.id}`);
      const userIdentifier = userId || userInfo.user_id || client.id;
      const displayUsername =
        username || userInfo.username || `User_${client.id.slice(0, 8)}`;

      // Set typing indicator in Redis with 5-second TTL
      const typingKey = `chat:room:${matchId}:typing:${userIdentifier}`;
      await this.redis.set(typingKey, displayUsername, 'EX', 5);

      // Broadcast typing indicator to room (excluding sender)
      const roomName = `chat:${matchId}`;
      client.to(roomName).emit('chat:typing', {
        matchId,
        userId: userIdentifier,
        username: displayUsername,
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle typing start for socket ${client.id}:`,
        error,
      );
    }
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { matchId: string; userId?: string },
  ) {
    try {
      const { matchId, userId } = payload;

      if (!matchId || typeof matchId !== 'string') {
        return; // Silently ignore invalid requests
      }

      // Get user info
      const userInfo = await this.redis.hgetall(`socket:${client.id}`);
      const userIdentifier = userId || userInfo.user_id || client.id;

      // Remove typing indicator from Redis
      const typingKey = `chat:room:${matchId}:typing:${userIdentifier}`;
      await this.redis.del(typingKey);

      // Broadcast typing stopped to room (excluding sender)
      const roomName = `chat:${matchId}`;
      client.to(roomName).emit('chat:typing_stopped', {
        matchId,
        userId: userIdentifier,
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle typing stop for socket ${client.id}:`,
        error,
      );
    }
  }
}
