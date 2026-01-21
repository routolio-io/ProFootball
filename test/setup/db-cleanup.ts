import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Match } from '../../src/domains/matches/entities/match.entity';
import { MatchEvent } from '../../src/domains/matches/entities/match-event.entity';
import { MatchStatistics } from '../../src/domains/matches/entities/match-statistics.entity';
import { ChatMessage } from '../../src/domains/chat/entities/chat-message.entity';

/**
 * Clear all test data from the database
 * This ensures test isolation between test runs
 */
export async function clearDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get<DataSource>(DataSource);

  // Check if DataSource is connected before attempting to clear
  if (!dataSource.isInitialized) {
    try {
      await dataSource.initialize();
    } catch (error) {
      console.warn('Failed to initialize DataSource:', error);
      return; // Skip cleanup if we can't connect
    }
  }

  try {
    // Delete in order to respect foreign key constraints
    // Events, Statistics, and ChatMessages have CASCADE delete, but we'll delete them explicitly for clarity
    // Use query builder to delete all records
    await dataSource.createQueryBuilder().delete().from(ChatMessage).execute();

    await dataSource.createQueryBuilder().delete().from(MatchEvent).execute();

    await dataSource
      .createQueryBuilder()
      .delete()
      .from(MatchStatistics)
      .execute();

    await dataSource.createQueryBuilder().delete().from(Match).execute();
  } catch (error) {
    // If database operations fail, log but don't throw to avoid breaking tests
    // This allows tests to continue even if cleanup fails
    console.warn('Database cleanup failed:', error);
    // Try to reconnect if connection was lost
    if (!dataSource.isInitialized) {
      try {
        await dataSource.initialize();
      } catch (initError) {
        console.warn('Failed to reinitialize DataSource:', initError);
      }
    }
  }
}
