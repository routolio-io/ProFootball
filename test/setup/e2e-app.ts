import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { startPostgres } from './postgres-container';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { SocketIoAdapter } from '../../src/providers/socket-io.adapter';

export async function setupE2EApp(options?: {
  runMigrations?: boolean;
  listen?: boolean;
}): Promise<{
  app: INestApplication;
  container: unknown;
  port?: number;
}> {
  // Start postgres container and set env vars before creating the app
  const started = await startPostgres();
  const container: unknown = started.container;

  // Verify container is still running before proceeding
  try {
    if (
      container &&
      typeof (container as { inspect: () => Promise<unknown> }).inspect ===
        'function'
    ) {
      const state = await (
        container as {
          inspect: () => Promise<{ State?: { Status?: string } }>;
        }
      ).inspect();
      if (state.State?.Status !== 'running') {
        throw new Error(
          `Container is not running. Status: ${state.State?.Status}`,
        );
      }
    }
  } catch (err) {
    console.warn('Could not verify container state, continuing anyway:', err);
  }

  // Build DATABASE_URL from container config
  const databaseUrl = `postgresql://${started.config.username}:${started.config.password}@${started.config.host}:${started.config.port}/${started.config.database}`;
  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = 'test';
  process.env.REDIS_URL = 'redis://localhost:6379'; // Use local Redis for tests

  // Wait a bit for the database to be fully ready (increased from 1s to 2s)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Set up Socket.IO adapter (required for WebSocket tests)
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // Enable CORS for Socket.IO
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Apply the same global configuration as in main.ts
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Initialize app first to get DataSource
  await app.init();

  // Ensure all module lifecycle hooks are called (e.g., OnModuleInit for RedisProvider)
  // This is important for providers that initialize in onModuleInit
  await app.getHttpServer();

  // Listen on a port if requested (for Socket.IO tests)
  let port: number | undefined;
  if (options?.listen) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const httpServer = app.getHttpServer();
    await new Promise<void>((resolve) => {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      httpServer.listen(() => {
        const address = httpServer.address();
        if (address && typeof address === 'object' && 'port' in address) {
          port = address.port as number;
        } else if (typeof address === 'string') {
          // Unix socket, shouldn't happen in tests
          port = 3000;
        } else {
          port = 3000;
        }
        resolve();
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    });
  }

  // For e2e tests, use synchronize instead of migrations for simplicity
  // This ensures the schema matches the entities exactly
  if (options?.runMigrations) {
    try {
      // Get DataSource from the Nest application container
      const dataSource = app.get<DataSource>(DataSource);
      if (dataSource && typeof dataSource.synchronize === 'function') {
        // Use synchronize for e2e tests - it's faster and ensures schema matches entities
        // NOTE: synchronize is intended for tests/dev only
        await dataSource.synchronize(true);
      }
    } catch (err) {
      // If synchronize fails, tear down the container and rethrow for diagnostics
      console.error('Failed to synchronize schema during e2e setup:', err);
      try {
        await app.close();
      } catch (closeErr) {
        void closeErr;
      }
      throw err;
    }
  }

  return { app, container, port };
}
