/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { setupE2EApp } from '../setup/e2e-app';
import { createTestMatch } from '../setup/db';
import { clearDatabase } from '../setup/db-cleanup';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SimulatorController (e2e)', () => {
  let app: INestApplication;
  let container: unknown;

  beforeAll(async () => {
    const started = await setupE2EApp({ runMigrations: true });
    app = started.app;
    container = started.container;
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

  describe('Start/Stop simulation', () => {
    it('should 404 when starting a non-existent match', (done) => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      request(app.getHttpServer())
        .post(`/api/simulator/matches/${fakeId}/start`)
        .expect(404)
        .end((error, response) => {
          if (error) return done(error);
          expect(response.body.success).toBe(false);
          expect(response.body.statusCode).toBe(404);
          done();
        });
    }, 10000);

    it('should start and stop simulation for a match', (done) => {
      createTestMatch(app)
        .then((match) => {
          request(app.getHttpServer())
            .post(`/api/simulator/matches/${match.id}/start`)
            .expect(201)
            .end((startErr, startRes) => {
              if (startErr) return done(startErr);
              expect(startRes.body.data.matchId).toBe(match.id);

              request(app.getHttpServer())
                .delete(`/api/simulator/matches/${match.id}/stop`)
                .expect(200)
                .end((stopErr, stopRes) => {
                  if (stopErr) return done(stopErr);
                  expect(stopRes.body.data.matchId).toBe(match.id);
                  done();
                });
            });
        })
        .catch((err) => done(err));
    }, 15000);

    it('should return already simulating on duplicate start', (done) => {
      createTestMatch(app)
        .then((match) => {
          request(app.getHttpServer())
            .post(`/api/simulator/matches/${match.id}/start`)
            .expect(201)
            .end((startErr) => {
              if (startErr) return done(startErr);
              request(app.getHttpServer())
                .post(`/api/simulator/matches/${match.id}/start`)
                .expect(201)
                .end((err, res) => {
                  if (err) return done(err);
                  expect(res.body.data.message).toContain('already');
                  done();
                });
            });
        })
        .catch((err) => done(err));
    }, 15000);

    it('should 404 when stopping a match that is not simulated', (done) => {
      createTestMatch(app)
        .then((match) => {
          request(app.getHttpServer())
            .delete(`/api/simulator/matches/${match.id}/stop`)
            .expect(404)
            .end((error, response) => {
              if (error) return done(error);
              expect(response.body.success).toBe(false);
              expect(response.body.statusCode).toBe(404);
              done();
            });
        })
        .catch((err) => done(err));
    }, 10000);
  });

  describe('Concurrent simulation', () => {
    it('should allow multiple matches to be simulated concurrently', (done) => {
      Promise.all([createTestMatch(app), createTestMatch(app)])
        .then(([m1, m2]) => {
          request(app.getHttpServer())
            .post(`/api/simulator/matches/${m1.id}/start`)
            .expect(201)
            .end((err1) => {
              if (err1) return done(err1);
              request(app.getHttpServer())
                .post(`/api/simulator/matches/${m2.id}/start`)
                .expect(201)
                .end((err2) => {
                  if (err2) return done(err2);
                  request(app.getHttpServer())
                    .post('/api/simulator/matches/start-multiple')
                    .expect(201)
                    .end((err3, res) => {
                      if (err3) return done(err3);
                      expect(Array.isArray(res.body.data.matchIds)).toBe(true);
                      expect(
                        res.body.data.matchIds.length,
                      ).toBeGreaterThanOrEqual(2);
                      done();
                    });
                });
            });
        })
        .catch((err) => done(err));
    }, 20000);
  });

  describe('Performance check (minute progression)', () => {
    it('should progress match minute after simulation starts', async () => {
      const match = await createTestMatch(app);
      await request(app.getHttpServer())
        .post(`/api/simulator/matches/${match.id}/start`)
        .expect(201);

      // Wait for scheduler to tick (1s interval) plus buffer
      // Need to wait at least 2 seconds to ensure the interval has fired
      // and the minute has been updated (interval runs every 1s)
      await sleep(2500);

      const res = await request(app.getHttpServer())
        .get(`/api/matches/${match.id}`)
        .expect(200);

      expect(Number(res.body.data.minute)).toBeGreaterThanOrEqual(1);
    }, 15000);
  });
});
