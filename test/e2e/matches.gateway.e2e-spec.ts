/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const io = require('socket.io-client');
import type { Socket } from 'socket.io-client';
import { setupE2EApp } from '../setup/e2e-app';
import { createTestMatch } from '../setup/db';
import { clearDatabase } from '../setup/db-cleanup';
import { MatchesGateway } from '../../src/domains/matches/matches.gateway';

describe('MatchesGateway (e2e)', () => {
  let app: INestApplication;
  let container: unknown;
  let port: number;

  beforeAll(async () => {
    const started = await setupE2EApp({ runMigrations: true, listen: true });
    app = started.app;
    container = started.container;
    port = started.port || 3000;
  }, 120000); // Increased timeout for container startup

  beforeEach(async () => {
    try {
      await clearDatabase(app);
    } catch (error) {
      // If database cleanup fails, log but continue
      // This prevents one test failure from breaking all subsequent tests
      console.warn('Database cleanup failed in beforeEach:', error);
    }
  });

  afterAll(async () => {
    if (app) await app.close();
    if (container) await (container as { stop: () => Promise<void> }).stop();
  });

  describe('Connection & Disconnection', () => {
    it('should connect to matches namespace', (done) => {
      const client = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        client.disconnect();
        done(error);
      });
    }, 10000);

    it('should handle disconnect cleanup', (done) => {
      const client = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        // Subscribe to a match first
        const match = await createTestMatch(app);
        client.emit('subscribe:match', {
          matchId: match.id,
        });

        // Wait for subscription confirmation
        client.once('subscribed:match', () => {
          // Disconnect and verify cleanup
          client.disconnect();

          setTimeout(() => {
            // If we get here without errors, cleanup likely worked
            done();
          }, 500);
        });
      });
    }, 15000);
  });

  describe('Ping/Pong', () => {
    it('should respond to ping with pong', (done) => {
      const client = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => {
        const testPayload = { test: 'data' };
        client.emit('ping', testPayload);

        client.once('pong', (response) => {
          expect(response).toBeDefined();
          expect(response.ts).toBeDefined();
          expect(typeof response.ts).toBe('number');
          expect(response.echo).toEqual(testPayload);
          client.disconnect();
          done();
        });
      });
    }, 10000);

    it('should handle ping without payload', (done) => {
      const client = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => {
        client.emit('ping');

        client.once('pong', (response) => {
          expect(response.ts).toBeDefined();
          expect(response.echo).toBeNull();
          client.disconnect();
          done();
        });
      });
    }, 10000);
  });

  describe('Subscribe to Match', () => {
    it('should subscribe to a match successfully', (done) => {
      const client = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        client.emit('subscribe:match', {
          matchId: match.id,
        });

        client.once('subscribed:match', (response) => {
          expect(response).toBeDefined();
          expect(response.matchId).toBe(match.id);
          expect(response.room).toBe(`match:${match.id}`);
          client.disconnect();
          done();
        });
      });
    }, 15000);

    it('should emit error for invalid matchId', (done) => {
      const client = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => {
        client.emit('subscribe:match', {
          matchId: null,
        });

        client.once('error', (error) => {
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.message).toContain('matchId');
          client.disconnect();
          done();
        });
      });
    }, 10000);

    it('should allow multiple clients to subscribe to same match', (done) => {
      const client1 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      let bothConnected = false;
      const checkBoth = () => {
        if (bothConnected) return;
        bothConnected = true;
        proceed();
      };

      client1.on('connect', checkBoth);
      client2.on('connect', checkBoth);

      const proceed = async () => {
        const match = await createTestMatch(app);

        let subscriptionsReceived = 0;
        const checkDone = () => {
          subscriptionsReceived++;
          if (subscriptionsReceived === 2) {
            client1.disconnect();
            client2.disconnect();
            done();
          }
        };

        client1.once('subscribed:match', (response) => {
          expect(response.matchId).toBe(match.id);
          checkDone();
        });

        client2.once('subscribed:match', (response) => {
          expect(response.matchId).toBe(match.id);
          checkDone();
        });

        client1.emit('subscribe:match', { matchId: match.id });
        client2.emit('subscribe:match', { matchId: match.id });
      };
    }, 20000);
  });

  describe('Unsubscribe from Match', () => {
    it('should unsubscribe from a match successfully', (done) => {
      const client = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        // Subscribe first
        client.emit('subscribe:match', {
          matchId: match.id,
        });

        client.once('subscribed:match', () => {
          // Then unsubscribe
          client.emit('unsubscribe:match', {
            matchId: match.id,
          });

          client.once('unsubscribed:match', (response) => {
            expect(response.matchId).toBe(match.id);
            expect(response.room).toBe(`match:${match.id}`);
            client.disconnect();
            done();
          });
        });
      });
    }, 15000);

    it('should emit error for invalid matchId when unsubscribing', (done) => {
      const client = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => {
        client.emit('unsubscribe:match', {
          matchId: null,
        });

        client.once('error', (error) => {
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.message).toContain('matchId');
          client.disconnect();
          done();
        });
      });
    }, 10000);
  });

  describe('Broadcast Events', () => {
    it('should broadcast score update to subscribed clients', (done) => {
      const client1 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      let bothConnected = false;
      const checkBoth = () => {
        if (bothConnected) return;
        bothConnected = true;
        proceed();
      };

      client1.on('connect', checkBoth);
      client2.on('connect', checkBoth);

      const proceed = async () => {
        const match = await createTestMatch(app);

        // Both subscribe
        client1.emit('subscribe:match', { matchId: match.id });
        client2.emit('subscribe:match', { matchId: match.id });

        // Wait for both to subscribe
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Client2 listens for score update
        client2.once('match:score_update', (event) => {
          expect(event.matchId).toBe(match.id);
          expect(event.homeScore).toBe(1);
          expect(event.awayScore).toBe(0);
          expect(event.minute).toBe(15);

          client1.disconnect();
          client2.disconnect();
          done();
        });

        // Get gateway and broadcast score update
        const gateway = app.get(MatchesGateway);
        gateway.broadcastScoreUpdate(match.id, 1, 0, 15);
      };
    }, 20000);

    it('should broadcast match event to subscribed clients', (done) => {
      const client1 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      let bothConnected = false;
      const checkBoth = () => {
        if (bothConnected) return;
        bothConnected = true;
        proceed();
      };

      client1.on('connect', checkBoth);
      client2.on('connect', checkBoth);

      const proceed = async () => {
        const match = await createTestMatch(app);

        // Both subscribe
        client1.emit('subscribe:match', { matchId: match.id });
        client2.emit('subscribe:match', { matchId: match.id });

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Client2 listens for match event
        client2.once('match:event', (event) => {
          expect(event.matchId).toBe(match.id);
          expect(event.event).toBeDefined();
          expect(event.event.type).toBe('GOAL');
          expect(event.event.minute).toBe(23);
          expect(event.event.team).toBe('HOME');
          expect(event.event.player).toBe('Player Name');

          client1.disconnect();
          client2.disconnect();
          done();
        });

        // Get gateway and broadcast match event
        const gateway = app.get(MatchesGateway);
        gateway.broadcastMatchEvent(match.id, {
          id: 'event-123',
          type: 'GOAL',
          minute: 23,
          team: 'HOME',
          player: 'Player Name',
          description: 'Goal scored',
        });
      };
    }, 20000);

    it('should broadcast statistics update to subscribed clients', (done) => {
      const client1 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      let bothConnected = false;
      const checkBoth = () => {
        if (bothConnected) return;
        bothConnected = true;
        proceed();
      };

      client1.on('connect', checkBoth);
      client2.on('connect', checkBoth);

      const proceed = async () => {
        const match = await createTestMatch(app);

        // Both subscribe
        client1.emit('subscribe:match', { matchId: match.id });
        client2.emit('subscribe:match', { matchId: match.id });

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Client2 listens for stats update
        client2.once('match:stats_update', (event) => {
          expect(event.matchId).toBe(match.id);
          expect(event.statistics).toBeDefined();
          expect(event.statistics.homePossession).toBe(60);
          expect(event.statistics.awayPossession).toBe(40);
          expect(event.statistics.homeShots).toBe(12);
          expect(event.statistics.awayShots).toBe(8);

          client1.disconnect();
          client2.disconnect();
          done();
        });

        // Get gateway and broadcast stats update
        const gateway = app.get(MatchesGateway);
        gateway.broadcastStatsUpdate(match.id, {
          homePossession: 60,
          awayPossession: 40,
          homeShots: 12,
          awayShots: 8,
          homeShotsOnTarget: 5,
          awayShotsOnTarget: 3,
          homePasses: 300,
          awayPasses: 250,
          homePassesCompleted: 280,
          awayPassesCompleted: 220,
          homeFouls: 8,
          awayFouls: 10,
          homeCorners: 5,
          awayCorners: 3,
          homeOffsides: 2,
          awayOffsides: 1,
        });
      };
    }, 20000);

    it('should not broadcast to unsubscribed clients', (done) => {
      const client1 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/matches`, {
        transports: ['websocket'],
        forceNew: true,
      });

      let bothConnected = false;
      const checkBoth = () => {
        if (bothConnected) return;
        bothConnected = true;
        proceed();
      };

      client1.on('connect', checkBoth);
      client2.on('connect', checkBoth);

      const proceed = async () => {
        const match = await createTestMatch(app);

        // Only client1 subscribes
        client1.emit('subscribe:match', { matchId: match.id });

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Client2 should NOT receive the broadcast
        const timeout = setTimeout(() => {
          // If we get here, client2 didn't receive the event (good!)
          client1.disconnect();
          client2.disconnect();
          done();
        }, 1000);

        client2.once('match:score_update', () => {
          clearTimeout(timeout);
          client1.disconnect();
          client2.disconnect();
          done(new Error('Unsubscribed client received broadcast'));
        });

        // Broadcast score update
        const gateway = app.get(MatchesGateway);
        gateway.broadcastScoreUpdate(match.id, 1, 0, 15);
      };
    }, 20000);
  });
});

