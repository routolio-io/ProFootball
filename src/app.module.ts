import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisProvider } from './providers/redis.provider';
import { MatchesModule } from './domains/matches/matches.module';
import { ChatModule } from './domains/chat/chat.module';
import { SimulatorModule } from './domains/simulator/simulator.module';

// Create naming strategy instance once to avoid type issues
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const snakeNamingStrategy = new SnakeNamingStrategy();

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TypeORM configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

        if (!databaseUrl) {
          if (nodeEnv === 'production') {
            throw new Error(
              'DATABASE_URL is required in production environment',
            );
          }
          console.warn(
            '⚠️  DATABASE_URL not set. Database features will be unavailable.',
          );
          // Return a minimal config that won't crash the app
          return {
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'postgres',
            entities: [],
            synchronize: false,
            autoLoadEntities: false,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            namingStrategy: snakeNamingStrategy,
          };
        }

        const baseConfig = {
          type: 'postgres' as const,
          url: databaseUrl,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/database/supabase/migrations/*{.ts,.js}'],
          synchronize: false, // Always use migrations
          logging: false, // Disable query logging for cleaner console output
          retryAttempts: 3,
          retryDelay: 3000,
          autoLoadEntities: true,
          connectTimeoutMS: 10000,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          namingStrategy: snakeNamingStrategy,
        };

        // Only enable SSL for non-test environments (Supabase requires SSL)
        // Testcontainers PostgreSQL doesn't support SSL
        if (nodeEnv !== 'test') {
          return {
            ...baseConfig,
            extra: {
              ssl: {
                rejectUnauthorized: false, // Supabase uses self-signed certificates
              },
            },
          };
        }

        return baseConfig;
      },
      inject: [ConfigService],
    }),
    // Schedule module for background tasks
    ScheduleModule.forRoot(),
    // Domain modules
    MatchesModule,
    ChatModule,
    SimulatorModule,
  ],
  controllers: [AppController],
  providers: [AppService, RedisProvider],
  exports: [RedisProvider],
})
export class AppModule {}
