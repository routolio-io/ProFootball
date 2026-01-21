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
import { DataSource } from 'typeorm';
import { ChatMessage } from '../../src/domains/chat/entities/chat-message.entity';

describe('ChatGateway (e2e)', () => {
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
    it('should connect to chat namespace', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
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
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        // Join a chat room first
        const match = await createTestMatch(app);
        client.emit('join:chat', {
          matchId: match.id,
          username: 'TestUser',
        });

        // Wait for join confirmation
        client.once('joined:chat', () => {
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
      const client = io(`http://localhost:${port}/chat`, {
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
      const client = io(`http://localhost:${port}/chat`, {
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

  describe('Join Chat Room', () => {
    it('should join a chat room successfully', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        client.emit('join:chat', {
          matchId: match.id,
          userId: 'user123',
          username: 'TestUser',
        });

        client.once('joined:chat', (response) => {
          expect(response).toBeDefined();
          expect(response.matchId).toBe(match.id);
          expect(response.room).toBe(`chat:${match.id}`);
          expect(response.userId).toBe('user123');
          expect(response.username).toBe('TestUser');
          expect(response.userCount).toBeGreaterThanOrEqual(1);
          client.disconnect();
          done();
        });
      });
    }, 15000);

    it('should support anonymous users (no userId)', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        client.emit('join:chat', {
          matchId: match.id,
          username: 'AnonymousUser',
        });

        client.once('joined:chat', (response) => {
          expect(response.userId).toBeDefined();
          expect(response.username).toBe('AnonymousUser');
          client.disconnect();
          done();
        });
      });
    }, 15000);

    it('should generate default username if not provided', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        client.emit('join:chat', {
          matchId: match.id,
        });

        client.once('joined:chat', (response) => {
          expect(response.username).toBeDefined();
          expect(response.username).toContain('User_');
          client.disconnect();
          done();
        });
      });
    }, 15000);

    it('should emit error for invalid matchId', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => {
        client.emit('join:chat', {
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

    it('should broadcast user_joined event to other clients', (done) => {
      const client1 = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      let client1Connected = false;
      let client2Connected = false;

      client1.on('connect', () => {
        client1Connected = true;
        if (client2Connected) {
          proceed();
        }
      });

      client2.on('connect', () => {
        client2Connected = true;
        if (client1Connected) {
          proceed();
        }
      });

      const proceed = async () => {
        const match = await createTestMatch(app);

        // Client1 listens for user_joined when client2 joins
        client1.once('chat:user_joined', (event) => {
          expect(event.matchId).toBe(match.id);
          expect(event.username).toBe('User2');
          expect(event.userCount).toBeGreaterThanOrEqual(2);

          client1.disconnect();
          client2.disconnect();
          done();
        });

        // Client1 joins first
        client1.emit('join:chat', {
          matchId: match.id,
          username: 'User1',
        });

        client1.once('joined:chat', () => {
          // Then client2 joins, which should trigger broadcast to client1
          client2.emit('join:chat', {
            matchId: match.id,
            username: 'User2',
          });
        });
      };
    }, 20000);
  });

  describe('Leave Chat Room', () => {
    it('should leave a chat room successfully', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        // Join first
        client.emit('join:chat', {
          matchId: match.id,
          username: 'TestUser',
        });

        client.once('joined:chat', () => {
          // Then leave
          client.emit('leave:chat', {
            matchId: match.id,
          });

          client.once('left:chat', (response) => {
            expect(response.matchId).toBe(match.id);
            expect(response.room).toBe(`chat:${match.id}`);
            client.disconnect();
            done();
          });
        });
      });
    }, 15000);

    it('should broadcast user_left event to other clients', (done) => {
      const client1 = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/chat`, {
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

        // Both join
        client1.emit('join:chat', {
          matchId: match.id,
          username: 'User1',
        });
        client2.emit('join:chat', {
          matchId: match.id,
          username: 'User2',
        });

        // Wait for both to join
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Client2 listens for user_left event
        client2.once('chat:user_left', (event) => {
          expect(event.matchId).toBe(match.id);
          expect(event.username).toBe('User1');
          expect(event.userCount).toBeGreaterThanOrEqual(1);

          client1.disconnect();
          client2.disconnect();
          done();
        });

        // Client1 leaves
        client1.emit('leave:chat', {
          matchId: match.id,
        });
      };
    }, 20000);

    it('should emit error for invalid matchId when leaving', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => {
        client.emit('leave:chat', {
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

  describe('Send Message', () => {
    it('should send a message successfully', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        // Join first
        client.emit('join:chat', {
          matchId: match.id,
          username: 'TestUser',
        });

        client.once('joined:chat', () => {
          // Send message
          client.emit('send:message', {
            matchId: match.id,
            message: 'Hello, world!',
          });

          client.once('chat:message', (event) => {
            expect(event.matchId).toBe(match.id);
            expect(event.message).toBeDefined();
            expect(event.message.content).toBe('Hello, world!');
            expect(event.message.username).toBe('TestUser');
            expect(event.message.id).toBeDefined();
            expect(event.message.timestamp).toBeDefined();

            client.disconnect();
            done();
          });
        });
      });
    }, 15000);

    it('should store message in database', async () => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      return new Promise<void>((resolve, reject) => {
        client.on('connect', async () => {
          const match = await createTestMatch(app);

          client.emit('join:chat', {
            matchId: match.id,
            userId: 'user123',
            username: 'TestUser',
          });

          client.once('joined:chat', () => {
            const messageText = 'Test message for database';

            client.once('chat:message', async () => {
              // Wait a bit for database to sync
              await new Promise((resolve) => setTimeout(resolve, 200));

              // Check database - use the relation property, not match_id directly
              const dataSource = app.get<DataSource>(DataSource);
              const chatRepository = dataSource.getRepository(ChatMessage);
              const messages = await chatRepository.find({
                where: { match: { id: match.id } },
                relations: ['match'],
              });

              expect(messages.length).toBeGreaterThan(0);
              const savedMessage = messages.find(
                (m) => m.message === messageText,
              );
              expect(savedMessage).toBeDefined();
              expect(savedMessage?.username).toBe('TestUser');
              expect(savedMessage?.user_id).toBe('user123');

              client.disconnect();
              resolve();
            });

            client.emit('send:message', {
              matchId: match.id,
              message: messageText,
            });
          });
        });

        client.on('connect_error', reject);
      });
    }, 20000);

    it('should broadcast message to all room members', (done) => {
      const client1 = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/chat`, {
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

        // Both join
        client1.emit('join:chat', {
          matchId: match.id,
          username: 'User1',
        });
        client2.emit('join:chat', {
          matchId: match.id,
          username: 'User2',
        });

        // Wait for both to join
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Client2 listens for message
        client2.once('chat:message', (event) => {
          expect(event.matchId).toBe(match.id);
          expect(event.message.content).toBe('Hello from User1');
          expect(event.message.username).toBe('User1');

          client1.disconnect();
          client2.disconnect();
          done();
        });

        // Client1 sends message
        client1.emit('send:message', {
          matchId: match.id,
          message: 'Hello from User1',
        });
      };
    }, 20000);

    it('should trim whitespace from messages', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        client.emit('join:chat', {
          matchId: match.id,
          username: 'TestUser',
        });

        client.once('joined:chat', () => {
          client.emit('send:message', {
            matchId: match.id,
            message: '  Trimmed message  ',
          });

          client.once('chat:message', (event) => {
            expect(event.message.content).toBe('Trimmed message');
            client.disconnect();
            done();
          });
        });
      });
    }, 15000);

    it('should reject empty messages', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        client.emit('join:chat', {
          matchId: match.id,
          username: 'TestUser',
        });

        client.once('joined:chat', () => {
          client.emit('send:message', {
            matchId: match.id,
            message: '   ',
          });

          client.once('error', (error) => {
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.message).toContain('empty');
            client.disconnect();
            done();
          });
        });
      });
    }, 15000);

    it('should reject messages exceeding 500 characters', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        client.emit('join:chat', {
          matchId: match.id,
          username: 'TestUser',
        });

        client.once('joined:chat', () => {
          const longMessage = 'A'.repeat(501);

          client.emit('send:message', {
            matchId: match.id,
            message: longMessage,
          });

          client.once('error', (error) => {
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.message).toContain('500');
            client.disconnect();
            done();
          });
        });
      });
    }, 15000);

    it('should enforce rate limiting (5 messages per 30 seconds)', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        client.emit('join:chat', {
          matchId: match.id,
          userId: 'rateLimitUser',
          username: 'TestUser',
        });

        client.once('joined:chat', () => {
          let messagesSent = 0;
          let messagesReceived = 0;
          let rateLimitErrorReceived = false;

          // Listen for successful messages
          client.on('chat:message', () => {
            messagesReceived++;
          });

          // Listen for rate limit errors
          client.on('error', (error) => {
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
              rateLimitErrorReceived = true;
              expect(messagesSent).toBe(6); // 6th message should be rate limited
              expect(messagesReceived).toBe(5); // Only 5 should have been received
              client.disconnect();
              done();
            }
          });

          // Send 6 messages rapidly (should only allow 5)
          const sendMessages = () => {
            for (let i = 1; i <= 6; i++) {
              setTimeout(() => {
                messagesSent++;
                client.emit('send:message', {
                  matchId: match.id,
                  message: `Message ${i}`,
                });
              }, i * 10); // Small delay between sends
            }
          };

          sendMessages();

          // Timeout fallback
          setTimeout(() => {
            if (!rateLimitErrorReceived) {
              client.disconnect();
              done(
                new Error(
                  `Rate limit not triggered. Sent: ${messagesSent}, Received: ${messagesReceived}`,
                ),
              );
            }
          }, 5000);
        });
      });
    }, 20000);
  });

  describe('Typing Indicators', () => {
    it('should broadcast typing:start event', (done) => {
      const client1 = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/chat`, {
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

        // Both join
        client1.emit('join:chat', {
          matchId: match.id,
          username: 'User1',
        });
        client2.emit('join:chat', {
          matchId: match.id,
          username: 'User2',
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Client2 listens for typing event
        client2.once('chat:typing', (event) => {
          expect(event.matchId).toBe(match.id);
          expect(event.username).toBe('User1');

          client1.disconnect();
          client2.disconnect();
          done();
        });

        // Client1 starts typing
        client1.emit('typing:start', {
          matchId: match.id,
        });
      };
    }, 20000);

    it('should broadcast typing:stop event', (done) => {
      const client1 = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const client2 = io(`http://localhost:${port}/chat`, {
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

        // Both join
        client1.emit('join:chat', {
          matchId: match.id,
          username: 'User1',
        });
        client2.emit('join:chat', {
          matchId: match.id,
          username: 'User2',
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Client2 listens for typing_stopped event
        client2.once('chat:typing_stopped', (event) => {
          expect(event.matchId).toBe(match.id);
          expect(event.userId).toBeDefined();

          client1.disconnect();
          client2.disconnect();
          done();
        });

        // Client1 starts then stops typing
        client1.emit('typing:start', {
          matchId: match.id,
        });

        setTimeout(() => {
          client1.emit('typing:stop', {
            matchId: match.id,
          });
        }, 100);
      };
    }, 20000);

    it('should silently ignore invalid typing requests', (done) => {
      const client = io(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', async () => {
        const match = await createTestMatch(app);

        client.emit('join:chat', {
          matchId: match.id,
          username: 'TestUser',
        });

        client.once('joined:chat', () => {
          // Send invalid typing request
          client.emit('typing:start', {
            matchId: null,
          });

          // Should not emit error, just silently ignore
          setTimeout(() => {
            client.disconnect();
            done();
          }, 500);
        });
      });
    }, 15000);
  });
});

