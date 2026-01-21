import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { Match, MatchStatus } from '../matches/entities/match.entity';
import {
  MatchEvent,
  EventType,
  Team,
} from '../matches/entities/match-event.entity';
import { MatchStatistics } from '../matches/entities/match-statistics.entity';
import { MatchesService } from '../matches/matches.service';
import { MatchesGateway } from '../matches/matches.gateway';
import { EventGeneratorService } from './event-generator.service';

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

@Injectable()
export class MatchSimulatorService implements OnModuleInit {
  private readonly logger = new Logger(MatchSimulatorService.name);
  private readonly activeMatches = new Map<string, MatchState>();

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchEvent)
    private readonly eventRepository: Repository<MatchEvent>,
    @InjectRepository(MatchStatistics)
    private readonly statisticsRepository: Repository<MatchStatistics>,
    private readonly matchesService: MatchesService,
    private readonly matchesGateway: MatchesGateway,
    private readonly eventGenerator: EventGeneratorService,
  ) {}

  /**
   * Start simulating a match
   */
  async startMatch(matchId: string): Promise<void> {
    await this.matchesService.findOne(matchId);

    if (this.activeMatches.has(matchId)) {
      this.logger.warn(`Match ${matchId} is already being simulated`);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const matchState: MatchState = {
      matchId,
      startTime: now, // Each match gets its own start time
      currentMinute: 0,
      status: MatchStatus.NOT_STARTED,
      lastEventMinute: 0,
      lastStatsUpdate: 0,
      substitutions: {
        home: 0,
        away: 0,
      },
    };

    // Get match details for logging
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });
    
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    this.activeMatches.set(matchId, matchState);
    this.logger.log(
      `[Match ${matchId.substring(0, 8)}...] Started simulation: ${match.home_team} vs ${match.away_team}, startTime=${now}, totalActiveMatches=${this.activeMatches.size}`,
    );

    // Initialize statistics if they don't exist
    const stats = await this.statisticsRepository.findOne({
      where: { match: { id: matchId } },
    });

    if (!stats) {
      const newStats = this.statisticsRepository.create({
        match: { id: matchId } as Partial<Match>,
        home_possession: 50,
        away_possession: 50,
        home_shots: 0,
        away_shots: 0,
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
      await this.statisticsRepository.save(newStats);
    }

    // Update match status to FIRST_HALF
    await this.matchRepository.update(matchId, {
      status: MatchStatus.FIRST_HALF,
      minute: 0,
    });

    matchState.status = MatchStatus.FIRST_HALF;
  }

  /**
   * Stop simulating a match
   */
  async stopMatch(matchId: string): Promise<void> {
    const state = this.activeMatches.get(matchId);
    if (!state) {
      return;
    }

    // Update match to FULL_TIME
    await this.matchRepository.update(matchId, {
      status: MatchStatus.FULL_TIME,
    });

    this.activeMatches.delete(matchId);
    this.logger.log(`Stopped simulation for match ${matchId}`);
  }

  /**
   * Progress time for all active matches
   * Called every 1 second (simulates 1 match minute)
   */
  async progressTime(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    // Process each match independently
    for (const [matchId, state] of this.activeMatches.entries()) {
      // Log which match we're processing for debugging
      this.logger.debug(
        `[Match ${matchId.substring(0, 8)}...] Processing: currentMinute=${state.currentMinute}, status=${state.status}, elapsed=${now - state.startTime}s`,
      );
      try {
        const elapsedSeconds = now - state.startTime;
        const newMinute = Math.floor(elapsedSeconds);

        // Update match minute
        if (newMinute !== state.currentMinute) {
          state.currentMinute = newMinute;

          // Handle match status transitions
          if (newMinute === 0 && state.status === MatchStatus.NOT_STARTED) {
            state.status = MatchStatus.FIRST_HALF;
            await this.matchRepository.update(matchId, {
              status: MatchStatus.FIRST_HALF,
              minute: newMinute,
            });
            // Broadcast status update
            this.matchesGateway.broadcastStatusUpdate(
              matchId,
              MatchStatus.FIRST_HALF,
              newMinute,
            );
          } else if (
            newMinute === 45 &&
            state.status === MatchStatus.FIRST_HALF
          ) {
            state.status = MatchStatus.HALF_TIME;
            await this.matchRepository.update(matchId, {
              status: MatchStatus.HALF_TIME,
              minute: newMinute,
            });
            // Broadcast status update
            this.matchesGateway.broadcastStatusUpdate(
              matchId,
              MatchStatus.HALF_TIME,
              newMinute,
            );
          } else if (
            newMinute === 46 &&
            state.status === MatchStatus.HALF_TIME
          ) {
            state.status = MatchStatus.SECOND_HALF;
            await this.matchRepository.update(matchId, {
              status: MatchStatus.SECOND_HALF,
              minute: newMinute,
            });
            // Broadcast status update
            this.matchesGateway.broadcastStatusUpdate(
              matchId,
              MatchStatus.SECOND_HALF,
              newMinute,
            );
          } else if (
            newMinute >= 90 &&
            state.status === MatchStatus.SECOND_HALF
          ) {
            state.status = MatchStatus.FULL_TIME;
            await this.matchRepository.update(matchId, {
              status: MatchStatus.FULL_TIME,
              minute: newMinute,
            });
            // Broadcast status update
            this.matchesGateway.broadcastStatusUpdate(
              matchId,
              MatchStatus.FULL_TIME,
              newMinute,
            );
            // Stop simulation
            this.activeMatches.delete(matchId);
            continue;
          } else {
            // Update minute
            await this.matchRepository.update(matchId, {
              minute: newMinute,
            });
          }

          // Generate events based on probabilities (before broadcasting score)
          // Events may update the score, so we check after event generation
          if (
            state.status === MatchStatus.FIRST_HALF ||
            state.status === MatchStatus.SECOND_HALF
          ) {
            await this.generateEvent(matchId, state, newMinute);
          }

          // Update statistics every 5 minutes
          if (newMinute - state.lastStatsUpdate >= 5) {
            await this.updateStatistics(matchId, state, newMinute);
            state.lastStatsUpdate = newMinute;
          }

          // Broadcast score update AFTER events are generated
          // This ensures we broadcast the latest score including any goals from events
          const match = await this.matchRepository.findOne({
            where: { id: matchId },
          });
          if (match) {
            // Log match details for debugging
            this.logger.log(
              `[Match ${matchId.substring(0, 8)}...] ${match.home_team} vs ${match.away_team} - Minute ${newMinute}, Score ${match.home_score}-${match.away_score}, Status ${match.status}`,
            );
            // Broadcast score update
            this.matchesGateway.broadcastScoreUpdate(
              matchId,
              match.home_score,
              match.away_score,
              newMinute,
            );
          } else {
            this.logger.warn(
              `Match ${matchId} not found in database during progressTime`,
            );
          }
        }
      } catch (error) {
        this.logger.error(`Error progressing match ${matchId}:`, error);
      }
    }
  }

  /**
   * Generate a random event for a match based on probabilities
   */
  private async generateEvent(
    matchId: string,
    state: MatchState,
    minute: number,
  ): Promise<void> {
    const event = this.eventGenerator.generateEvent(matchId, state, minute);

    if (event) {
      // Save event to database
      const matchEvent = this.eventRepository.create({
        match: { id: matchId } as Partial<Match>,
        type: event.type,
        minute: event.minute,
        team: event.team,
        player: event.player,
        description: event.description,
      });

      const savedEvent = await this.eventRepository.save(matchEvent);
      this.logger.log(
        `[Match ${matchId.substring(0, 8)}...] Generated event: ${event.type} at minute ${minute} for ${event.team} team`,
      );

      // Update match score if it's a goal
      if (event.type === EventType.GOAL) {
        const match = await this.matchRepository.findOne({
          where: { id: matchId },
        });
        if (match) {
          const oldScore = `${match.home_score}-${match.away_score}`;
          if (event.team === Team.HOME) {
            match.home_score += 1;
          } else {
            match.away_score += 1;
          }
          await this.matchRepository.save(match);
          const newScore = `${match.home_score}-${match.away_score}`;

          this.logger.log(
            `[Match ${matchId.substring(0, 8)}...] GOAL! Score updated from ${oldScore} to ${newScore} at minute ${minute}`,
          );

          // Broadcast score update
          this.matchesGateway.broadcastScoreUpdate(
            matchId,
            match.home_score,
            match.away_score,
            minute,
          );
        }
      }

      // Broadcast event
      this.matchesGateway.broadcastMatchEvent(matchId, {
        id: savedEvent.id,
        type: savedEvent.type,
        minute: savedEvent.minute,
        team: savedEvent.team,
        player: savedEvent.player,
        description: savedEvent.description,
      });

      state.lastEventMinute = minute;
    }
  }

  /**
   * Update match statistics
   */
  private async updateStatistics(
    matchId: string,
    state: MatchState,
    minute: number,
  ): Promise<void> {
    const stats = await this.statisticsRepository.findOne({
      where: { match: { id: matchId } },
    });

    if (!stats) {
      return;
    }

    // Generate realistic statistics based on match progress
    const statsUpdate = this.eventGenerator.generateStatistics(state, minute);

    // Update statistics
    Object.assign(stats, statsUpdate);
    await this.statisticsRepository.save(stats);

    // Broadcast statistics update
    this.matchesGateway.broadcastStatsUpdate(matchId, {
      homePossession: stats.home_possession,
      awayPossession: stats.away_possession,
      homeShots: stats.home_shots,
      awayShots: stats.away_shots,
      homeShotsOnTarget: stats.home_shots_on_target,
      awayShotsOnTarget: stats.away_shots_on_target,
      homePasses: stats.home_passes,
      awayPasses: stats.away_passes,
      homePassesCompleted: stats.home_passes_completed,
      awayPassesCompleted: stats.away_passes_completed,
      homeFouls: stats.home_fouls,
      awayFouls: stats.away_fouls,
      homeCorners: stats.home_corners,
      awayCorners: stats.away_corners,
      homeOffsides: stats.home_offsides,
      awayOffsides: stats.away_offsides,
    });
  }

  /**
   * Get list of active match IDs
   */
  getActiveMatches(): string[] {
    return Array.from(this.activeMatches.keys());
  }

  /**
   * Check if a match is being simulated
   */
  isMatchActive(matchId: string): boolean {
    return this.activeMatches.has(matchId);
  }

  /**
   * Start simulating multiple matches (3-5 matches for demo/testing)
   * Finds matches that are NOT_STARTED and starts simulating them
   */
  async startMultipleMatches(maxMatches: number = 5): Promise<string[]> {
    // Find matches that are NOT_STARTED and not already being simulated
    const availableMatches = await this.matchRepository.find({
      where: { status: MatchStatus.NOT_STARTED },
      order: { kickoff_time: 'ASC' }, // Start oldest matches first
      take: maxMatches + this.activeMatches.size, // Get enough to fill up to maxMatches
    });

    // Filter out matches that are already being simulated
    const matchesToStart = availableMatches
      .filter((match) => !this.activeMatches.has(match.id))
      .slice(0, maxMatches);

    const startedMatchIds: string[] = [];

    // Start each match
    for (const match of matchesToStart) {
      try {
        await this.startMatch(match.id);
        startedMatchIds.push(match.id);
        this.logger.log(
          `Started match ${match.id} (${match.home_team} vs ${match.away_team})`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to start match ${match.id}: ${errorMessage}`);
      }
    }

    this.logger.log(
      `Started ${startedMatchIds.length} matches. Total active matches: ${this.activeMatches.size}`,
    );

    return startedMatchIds;
  }

  /**
   * Initialize scheduler on module init
   */
  onModuleInit() {
    this.logger.log('Match Simulator Service initialized');
  }

  /**
   * Run every 1 second to progress match time
   * This simulates 1 match minute per real second
   */
  @Interval(1000)
  async handleInterval() {
    if (this.activeMatches.size > 0) {
      await this.progressTime();
    }
  }
}
