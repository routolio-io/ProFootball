import { faker } from '@faker-js/faker';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { MatchesService } from '../../src/domains/matches/matches.service';
import {
  Match,
  MatchStatus,
} from '../../src/domains/matches/entities/match.entity';
import {
  MatchEvent,
  EventType,
  Team,
} from '../../src/domains/matches/entities/match-event.entity';
import { MatchStatistics } from '../../src/domains/matches/entities/match-statistics.entity';

/**
 * Create a test match
 */
export const createTestMatch = async (
  app: INestApplication,
  partial?: Partial<{
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    minute: number;
    status: MatchStatus;
    kickoff_time: number;
  }>,
): Promise<Match> => {
  try {
    const matchesService = app.get<MatchesService>(MatchesService);

    return await matchesService.create({
      home_team: partial?.home_team || faker.company.name(),
      away_team: partial?.away_team || faker.company.name(),
      home_score: partial?.home_score ?? 0,
      away_score: partial?.away_score ?? 0,
      minute: partial?.minute ?? 0,
      status: partial?.status || MatchStatus.NOT_STARTED,
      kickoff_time: partial?.kickoff_time || Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    // If database operation fails, check if it's a connection issue
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('container stopped') ||
      errorMessage.includes('Connection terminated') ||
      errorMessage.includes('Driver not Connected')
    ) {
      throw new Error(
        `Database container appears to have stopped. Original error: ${errorMessage}`,
      );
    }
    throw error;
  }
};

/**
 * Create a test match event
 */
export const createTestMatchEvent = async (
  app: INestApplication,
  matchId: string,
  partial?: Partial<{
    type: EventType;
    minute: number;
    team: Team;
    player: string;
    description: string;
  }>,
): Promise<MatchEvent> => {
  const dataSource = app.get<DataSource>(DataSource);

  const eventRepository = dataSource.getRepository(MatchEvent);
  const matchRepository = dataSource.getRepository(Match);

  // Get the match entity to set the relation properly
  const match = await matchRepository.findOne({ where: { id: matchId } });
  if (!match) {
    throw new Error(`Match with id ${matchId} not found`);
  }

  const event = eventRepository.create({
    match: match, // Set the relation, not just match_id
    type: partial?.type || EventType.GOAL,
    minute: partial?.minute ?? 0,
    team: partial?.team || Team.HOME,
    player: partial?.player || faker.person.fullName(),
    description: partial?.description || faker.lorem.sentence(),
  });

  return eventRepository.save(event);
};

/**
 * Create test match statistics
 */
export const createTestMatchStatistics = async (
  app: INestApplication,
  matchId: string,
  partial?: Partial<{
    home_possession: number;
    away_possession: number;
    home_shots: number;
    away_shots: number;
  }>,
): Promise<MatchStatistics> => {
  const dataSource = app.get<DataSource>(DataSource);

  const statsRepository = dataSource.getRepository(MatchStatistics);
  const matchRepository = dataSource.getRepository(Match);

  // Get the match entity to set the relation properly
  const match = await matchRepository.findOne({ where: { id: matchId } });
  if (!match) {
    throw new Error(`Match with id ${matchId} not found`);
  }

  const stats = statsRepository.create({
    match: match, // Set the relation, not just match_id
    home_possession: partial?.home_possession ?? 50,
    away_possession: partial?.away_possession ?? 50,
    home_shots: partial?.home_shots ?? 0,
    away_shots: partial?.away_shots ?? 0,
    home_shots_on_target: 0,
    away_shots_on_target: 0,
    home_passes: 0,
    away_passes: 0,
    home_passes_completed: 0,
    away_passes_completed: 0,
    home_fouls: 0,
    away_fouls: 0,
    home_corners: 0,
    away_corners: 0,
    home_offsides: 0,
    away_offsides: 0,
  });

  return statsRepository.save(stats);
};
