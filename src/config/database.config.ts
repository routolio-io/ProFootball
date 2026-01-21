import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/supabase/migrations/*{.ts,.js}'],
  synchronize: false, // Always use migrations in production
  logging: false, // Disable query logging for cleaner console output
  namingStrategy: new SnakeNamingStrategy(),
};

export default new DataSource(databaseConfig);
