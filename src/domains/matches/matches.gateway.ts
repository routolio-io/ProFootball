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
import { MatchEventsService } from './match-events.service';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
    ],
    credentials: true,
  },
  namespace: '/matches',
})
export class MatchesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchesGateway.name);

  constructor(
    @Inject(RedisProvider) private readonly redisProvider: RedisProvider,
    private readonly matchEventsService: MatchEventsService,
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
        namespace: '/matches',
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
      // Get all matches this socket was subscribed to
      const matchesKey = `socket:${client.id}:matches`;
      const matchIds = await this.redis.smembers(matchesKey);

      // Remove socket from each match's subscriber set
      for (const matchId of matchIds) {
        const subscribersKey = `match:${matchId}:subscribers`;
        await this.redis.srem(subscribersKey, client.id);
      }

      // Clean up socket tracking keys
      await this.redis.del(`socket:${client.id}`);
      await this.redis.del(matchesKey);

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

      // Basic heartbeat response
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

  @SubscribeMessage('subscribe:match')
  async handleSubscribeMatch(
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

      // Join Socket.IO room for this match
      const roomName = `match:${matchId}`;
      await client.join(roomName);

      // Track subscription in Redis
      const subscribersKey = `match:${matchId}:subscribers`;
      const socketMatchesKey = `socket:${client.id}:matches`;

      await this.redis.sadd(subscribersKey, client.id);
      await this.redis.sadd(socketMatchesKey, matchId);

      // Update last ping time
      await this.redis.hset(`socket:${client.id}`, {
        last_ping: Date.now().toString(),
      });

      // Emit confirmation
      client.emit('subscribed:match', {
        matchId,
        room: roomName,
      });

      this.logger.debug(`Socket ${client.id} subscribed to match ${matchId}`);
    } catch (error) {
      this.logger.error(
        `Failed to subscribe socket ${client.id} to match:`,
        error,
      );
      client.emit('error', {
        code: 'SUBSCRIPTION_ERROR',
        message: 'Failed to subscribe to match',
      });
    }
  }

  @SubscribeMessage('unsubscribe:match')
  async handleUnsubscribeMatch(
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
      const roomName = `match:${matchId}`;
      await client.leave(roomName);

      // Remove from Redis tracking
      const subscribersKey = `match:${matchId}:subscribers`;
      const socketMatchesKey = `socket:${client.id}:matches`;

      await this.redis.srem(subscribersKey, client.id);
      await this.redis.srem(socketMatchesKey, matchId);

      // Emit confirmation
      client.emit('unsubscribed:match', {
        matchId,
        room: roomName,
      });

      this.logger.debug(
        `Socket ${client.id} unsubscribed from match ${matchId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe socket ${client.id} from match:`,
        error,
      );
      client.emit('error', {
        code: 'UNSUBSCRIPTION_ERROR',
        message: 'Failed to unsubscribe from match',
      });
    }
  }

  /**
   * Broadcast match score update to all subscribers
   */
  broadcastScoreUpdate(
    matchId: string,
    homeScore: number,
    awayScore: number,
    minute: number,
  ) {
    this.logger.log(
      `Broadcasting score update for match ${matchId}: ${homeScore}-${awayScore} at minute ${minute}`,
    );
    const data = {
      matchId,
      homeScore,
      awayScore,
      minute,
    };
    this.server.to(`match:${matchId}`).emit('match:score_update', data);
    // Also emit to SSE stream
    this.matchEventsService.emitEvent(matchId, {
      id: `score-${Date.now()}`,
      type: 'score_update',
      data,
    });
    this.logger.log(`Emitted score update to SSE stream for match ${matchId}`);
  }

  /**
   * Broadcast match event to all subscribers
   */
  broadcastMatchEvent(
    matchId: string,
    event: {
      id: string;
      type: string;
      minute: number;
      team: string;
      player?: string;
      description?: string;
    },
  ) {
    this.logger.log(
      `Broadcasting match event for match ${matchId}: ${event.type} at minute ${event.minute}`,
    );
    const data = {
      matchId,
      event,
    };
    this.server.to(`match:${matchId}`).emit('match:event', data);
    // Also emit to SSE stream
    this.matchEventsService.emitEvent(matchId, {
      id: `event-${event.id || Date.now()}`,
      type: 'match_event',
      data,
    });
    this.logger.log(`Emitted match event to SSE stream for match ${matchId}`);
  }

  /**
   * Broadcast match statistics update to all subscribers
   */
  broadcastStatsUpdate(
    matchId: string,
    statistics: {
      homePossession: number;
      awayPossession: number;
      homeShots: number;
      awayShots: number;
      homeShotsOnTarget: number;
      awayShotsOnTarget: number;
      homePasses: number;
      awayPasses: number;
      homePassesCompleted: number;
      awayPassesCompleted: number;
      homeFouls: number;
      awayFouls: number;
      homeCorners: number;
      awayCorners: number;
      homeOffsides: number;
      awayOffsides: number;
    },
  ) {
    this.logger.log(
      `Broadcasting statistics update for match ${matchId}: ${statistics.homePossession}-${statistics.awayPossession} possession`,
    );
    const data = {
      matchId,
      statistics,
    };
    this.server.to(`match:${matchId}`).emit('match:stats_update', data);
    // Also emit to SSE stream
    this.matchEventsService.emitEvent(matchId, {
      id: `stats-${Date.now()}`,
      type: 'stats_update',
      data,
    });
    this.logger.log(
      `Emitted statistics update to SSE stream for match ${matchId}`,
    );
  }

  /**
   * Broadcast match status update to all subscribers
   */
  broadcastStatusUpdate(matchId: string, status: string, minute: number) {
    this.logger.log(
      `Broadcasting status update for match ${matchId}: ${status} at minute ${minute}`,
    );
    const data = {
      matchId,
      status,
      minute,
    };
    this.server.to(`match:${matchId}`).emit('match:status_update', data);
    // Also emit to SSE stream
    this.matchEventsService.emitEvent(matchId, {
      id: `status-${Date.now()}`,
      type: 'status_update',
      data,
    });
  }
}
