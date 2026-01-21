import { Injectable } from '@nestjs/common';
import { EventType, Team } from '../matches/entities/match-event.entity';
import { MatchStatus } from '../matches/entities/match.entity';
import { faker } from '@faker-js/faker';

interface MatchState {
  matchId: string;
  startTime: number;
  currentMinute: number;
  status: MatchStatus;
  lastEventMinute: number;
  lastStatsUpdate: number;
  substitutions: {
    home: number;
    away: number;
  };
}

interface GeneratedEvent {
  type: EventType;
  minute: number;
  team: Team;
  player?: string;
  description: string;
}

@Injectable()
export class EventGeneratorService {
  /**
   * Generate a random event based on probabilities
   */
  generateEvent(
    matchId: string,
    state: MatchState,
    minute: number,
  ): GeneratedEvent | null {
    // Don't generate events during half-time
    if (state.status === MatchStatus.HALF_TIME) {
      return null;
    }

    // Don't generate events before match starts or after full time
    if (
      state.status === MatchStatus.NOT_STARTED ||
      state.status === MatchStatus.FULL_TIME
    ) {
      return null;
    }

    const random = Math.random();
    const isSecondHalf = state.status === MatchStatus.SECOND_HALF;
    const team = Math.random() < 0.52 ? Team.HOME : Team.AWAY; // Slight home advantage

    // Goals: ~2.5 per match = ~0.028 per minute
    // Higher probability in second half
    const goalProbability = isSecondHalf ? 0.035 : 0.02;
    if (random < goalProbability) {
      return {
        type: EventType.GOAL,
        minute,
        team,
        player: faker.person.fullName(),
        description: `${team === Team.HOME ? 'Home' : 'Away'} team scores!`,
      };
    }

    // Yellow Cards: ~3-4 per match = ~0.04 per minute
    // More likely in second half
    const yellowCardProbability = isSecondHalf ? 0.05 : 0.03;
    if (random < goalProbability + yellowCardProbability) {
      return {
        type: EventType.YELLOW_CARD,
        minute,
        team,
        player: faker.person.fullName(),
        description: `Yellow card shown to ${team === Team.HOME ? 'home' : 'away'} team player`,
      };
    }

    // Red Cards: rare = ~0.002 per minute
    const redCardProbability = 0.002;
    if (random < goalProbability + yellowCardProbability + redCardProbability) {
      return {
        type: EventType.RED_CARD,
        minute,
        team,
        player: faker.person.fullName(),
        description: `Red card shown to ${team === Team.HOME ? 'home' : 'away'} team player`,
      };
    }

    // Substitutions: 3-5 per team, typically after 60'
    // First sub: 60-70 minutes, Subsequent: 70-85 minutes
    const substitutionProbability = minute >= 60 && minute <= 85 ? 0.01 : 0; // ~1 per 5 minutes
    if (substitutionProbability > 0) {
      if (
        random <
        goalProbability +
          yellowCardProbability +
          redCardProbability +
          substitutionProbability
      ) {
        // Check if team has substitution slots
        const teamSubs =
          team === Team.HOME
            ? state.substitutions.home
            : state.substitutions.away;
        if (teamSubs < 5) {
          if (team === Team.HOME) {
            state.substitutions.home += 1;
          } else {
            state.substitutions.away += 1;
          }

          return {
            type: EventType.SUBSTITUTION,
            minute,
            team,
            player: faker.person.fullName(),
            description: `Substitution for ${team === Team.HOME ? 'home' : 'away'} team`,
          };
        }
      }
    }

    // Fouls: every 2-3 minutes = ~0.4 per minute
    const foulProbability = 0.4;
    if (
      random <
      goalProbability +
        yellowCardProbability +
        redCardProbability +
        substitutionProbability +
        foulProbability
    ) {
      return {
        type: EventType.FOUL,
        minute,
        team,
        description: `Foul committed by ${team === Team.HOME ? 'home' : 'away'} team`,
      };
    }

    // Shots: every 3-5 minutes = ~0.25 per minute
    const shotProbability = 0.25;
    if (
      random <
      goalProbability +
        yellowCardProbability +
        redCardProbability +
        substitutionProbability +
        foulProbability +
        shotProbability
    ) {
      return {
        type: EventType.SHOT,
        minute,
        team,
        player: faker.person.fullName(),
        description: `Shot by ${team === Team.HOME ? 'home' : 'away'} team`,
      };
    }

    return null;
  }

  /**
   * Generate realistic statistics based on match progress
   */
  generateStatistics(
    state: MatchState,
    minute: number,
  ): Partial<{
    home_possession: number;
    away_possession: number;
    home_shots: number;
    away_shots: number;
    home_shots_on_target: number;
    away_shots_on_target: number;
    home_passes: number;
    away_passes: number;
    home_passes_completed: number;
    away_passes_completed: number;
    home_fouls: number;
    away_fouls: number;
    home_corners: number;
    away_corners: number;
    home_offsides: number;
    away_offsides: number;
  }> {
    const progress = minute / 90; // 0 to 1
    const isSecondHalf = state.status === MatchStatus.SECOND_HALF;

    // Possession: slight home advantage, varies between 45-60%
    const baseHomePossession = 50 + (Math.random() - 0.5) * 10;
    const homePossession = Math.max(40, Math.min(60, baseHomePossession));
    const awayPossession = 100 - homePossession;

    // Shots increase with match progress
    const baseShots = Math.floor(progress * 20 + Math.random() * 5);
    const homeShots = baseShots + Math.floor(Math.random() * 3);
    const awayShots = baseShots - Math.floor(Math.random() * 3);

    // Shots on target: ~40% of total shots
    const homeShotsOnTarget = Math.floor(
      homeShots * (0.35 + Math.random() * 0.1),
    );
    const awayShotsOnTarget = Math.floor(
      awayShots * (0.35 + Math.random() * 0.1),
    );

    // Passes: increase with match progress, more in second half
    const basePasses = Math.floor(
      (isSecondHalf ? 400 : 200) + progress * 200 + Math.random() * 100,
    );
    const homePasses = basePasses + Math.floor(Math.random() * 50);
    const awayPasses = basePasses - Math.floor(Math.random() * 50);

    // Pass completion: ~85-95%
    const homePassCompletion = 0.85 + Math.random() * 0.1;
    const awayPassCompletion = 0.85 + Math.random() * 0.1;
    const homePassesCompleted = Math.floor(homePasses * homePassCompletion);
    const awayPassesCompleted = Math.floor(awayPasses * awayPassCompletion);

    // Fouls: increase with match progress
    const homeFouls = Math.floor(progress * 8 + Math.random() * 3);
    const awayFouls = Math.floor(progress * 8 + Math.random() * 3);

    // Corners: ~5-8 per match
    const homeCorners = Math.floor(progress * 5 + Math.random() * 2);
    const awayCorners = Math.floor(progress * 5 + Math.random() * 2);

    // Offsides: ~2-4 per match
    const homeOffsides = Math.floor(progress * 2 + Math.random() * 1);
    const awayOffsides = Math.floor(progress * 2 + Math.random() * 1);

    return {
      home_possession: Math.round(homePossession),
      away_possession: Math.round(awayPossession),
      home_shots: Math.max(0, homeShots),
      away_shots: Math.max(0, awayShots),
      home_shots_on_target: Math.max(0, homeShotsOnTarget),
      away_shots_on_target: Math.max(0, awayShotsOnTarget),
      home_passes: Math.max(0, homePasses),
      away_passes: Math.max(0, awayPasses),
      home_passes_completed: Math.max(0, homePassesCompleted),
      away_passes_completed: Math.max(0, awayPassesCompleted),
      home_fouls: Math.max(0, homeFouls),
      away_fouls: Math.max(0, awayFouls),
      home_corners: Math.max(0, homeCorners),
      away_corners: Math.max(0, awayCorners),
      home_offsides: Math.max(0, homeOffsides),
      away_offsides: Math.max(0, awayOffsides),
    };
  }
}
