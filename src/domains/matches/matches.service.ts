import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { MatchEvent, EventType, Team } from './entities/match-event.entity';
import { MatchStatistics } from './entities/match-statistics.entity';
import { CreateMatchEventDto } from './dto/create-match-event.dto';
import { UpdateMatchEventDto } from './dto/update-match-event.dto';
import { CreateMatchStatisticsDto } from './dto/create-match-statistics.dto';
import { UpdateMatchStatisticsDto } from './dto/update-match-statistics.dto';
import { MatchEventsService } from './match-events.service';
import { MatchesGateway } from './matches.gateway';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchEvent)
    private readonly eventRepository: Repository<MatchEvent>,
    @InjectRepository(MatchStatistics)
    private readonly statisticsRepository: Repository<MatchStatistics>,
    private readonly matchEventsService: MatchEventsService,
    @Inject(forwardRef(() => MatchesGateway))
    private readonly matchesGateway: MatchesGateway,
  ) {}

  async findAll(): Promise<Match[]> {
    return this.matchRepository.find({
      order: { kickoff_time: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['events', 'statistics'],
      order: {
        events: {
          minute: 'ASC',
          created_at: 'ASC',
        },
      },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    return match;
  }

  async create(matchData: Partial<Match>): Promise<Match> {
    const match = this.matchRepository.create(matchData);
    return this.matchRepository.save(match);
  }

  async update(id: string, updateData: Partial<Match>): Promise<Match> {
    const oldMatch = await this.matchRepository.findOne({ where: { id } });
    if (!oldMatch) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    await this.matchRepository.update(id, updateData);
    const updatedMatch = await this.findOne(id);

    // Broadcast status update if status changed
    if (
      updateData.status !== undefined &&
      updateData.status !== oldMatch.status
    ) {
      this.matchesGateway.broadcastStatusUpdate(
        id,
        updateData.status,
        updatedMatch.minute,
      );
    }

    return updatedMatch;
  }

  async remove(id: string): Promise<void> {
    const result = await this.matchRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }
  }

  // Match Events methods
  async createEvent(
    matchId: string,
    createEventDto: CreateMatchEventDto,
  ): Promise<MatchEvent> {
    // Verify match exists and get the full entity
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    const event = this.eventRepository.create({
      match: match, // Use the full match entity instead of partial
      type: createEventDto.type,
      minute: createEventDto.minute,
      team: createEventDto.team,
      player: createEventDto.player,
      description: createEventDto.description,
    });

    const savedEvent = await this.eventRepository.save(event);
    this.logger.log(
      `Created match event: ${savedEvent.type} at minute ${savedEvent.minute} for match ${matchId}`,
    );

    // If it's a goal, update match score
    if (savedEvent.type === EventType.GOAL) {
      // Reload match to get latest score in case it was updated elsewhere
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: matchId },
      });
      if (!updatedMatch) {
        throw new NotFoundException(`Match with ID ${matchId} not found`);
      }

      if (savedEvent.team === Team.HOME) {
        updatedMatch.home_score += 1;
      } else {
        updatedMatch.away_score += 1;
      }
      await this.matchRepository.save(updatedMatch);
      this.logger.log(
        `Updated match score: ${updatedMatch.home_score}-${updatedMatch.away_score} for match ${matchId}`,
      );

      // Broadcast score update to SSE and Socket.IO
      this.matchesGateway.broadcastScoreUpdate(
        matchId,
        updatedMatch.home_score,
        updatedMatch.away_score,
        savedEvent.minute,
      );
      this.logger.log(`Broadcasted score update for match ${matchId}`);
    }

    // Broadcast match event to SSE and Socket.IO
    this.matchesGateway.broadcastMatchEvent(matchId, {
      id: savedEvent.id,
      type: savedEvent.type,
      minute: savedEvent.minute,
      team: savedEvent.team,
      player: savedEvent.player,
      description: savedEvent.description,
    });
    this.logger.log(`Broadcasted match event for match ${matchId}`);

    return savedEvent;
  }

  async updateEvent(
    matchId: string,
    eventId: string,
    updateEventDto: UpdateMatchEventDto,
  ): Promise<MatchEvent> {
    // Verify match exists
    await this.findOne(matchId);

    const event = await this.eventRepository.findOne({
      where: { id: eventId, match: { id: matchId } },
    });

    if (!event) {
      throw new NotFoundException(
        `Match event with ID ${eventId} not found for match ${matchId}`,
      );
    }

    // Track changes that affect scores
    const wasGoal = event.type === EventType.GOAL;
    const wasHomeGoal = wasGoal && event.team === Team.HOME;
    const wasAwayGoal = wasGoal && event.team === Team.AWAY;

    // Only update provided fields
    if (updateEventDto.type !== undefined) event.type = updateEventDto.type;
    if (updateEventDto.minute !== undefined)
      event.minute = updateEventDto.minute;
    if (updateEventDto.team !== undefined) event.team = updateEventDto.team;
    if (updateEventDto.player !== undefined)
      event.player = updateEventDto.player;
    if (updateEventDto.description !== undefined)
      event.description = updateEventDto.description;

    const savedEvent = await this.eventRepository.save(event);
    this.logger.log(
      `Updated match event ${eventId} for match ${matchId}: ${savedEvent.type} at minute ${savedEvent.minute}`,
    );

    // Check if score recalculation is needed
    const isNowGoal = savedEvent.type === EventType.GOAL;
    const isNowHomeGoal = isNowGoal && savedEvent.team === Team.HOME;
    const isNowAwayGoal = isNowGoal && savedEvent.team === Team.AWAY;

    const scoreChanged =
      wasGoal !== isNowGoal || // Type changed (GOAL <-> non-GOAL)
      (wasGoal &&
        isNowGoal &&
        (wasHomeGoal !== isNowHomeGoal || wasAwayGoal !== isNowAwayGoal)); // Team changed for a goal

    // Recalculate scores if needed
    if (scoreChanged) {
      // Get all GOAL events for this match
      const allGoals = await this.eventRepository.find({
        where: {
          match: { id: matchId },
          type: EventType.GOAL,
        },
      });

      // Count goals by team
      let homeGoals = 0;
      let awayGoals = 0;

      for (const goal of allGoals) {
        if (goal.team === Team.HOME) {
          homeGoals++;
        } else {
          awayGoals++;
        }
      }

      // Reload match to get latest data
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: matchId },
      });

      if (!updatedMatch) {
        throw new NotFoundException(`Match with ID ${matchId} not found`);
      }

      // Update scores
      updatedMatch.home_score = homeGoals;
      updatedMatch.away_score = awayGoals;
      await this.matchRepository.save(updatedMatch);

      this.logger.log(
        `Recalculated match scores: ${homeGoals}-${awayGoals} for match ${matchId} after event update`,
      );

      // Broadcast score update to SSE and Socket.IO
      this.matchesGateway.broadcastScoreUpdate(
        matchId,
        homeGoals,
        awayGoals,
        savedEvent.minute,
      );
      this.logger.log(`Broadcasted score update after event update`);
    }

    // Broadcast match event update to SSE and Socket.IO
    this.matchesGateway.broadcastMatchEvent(matchId, {
      id: savedEvent.id,
      type: savedEvent.type,
      minute: savedEvent.minute,
      team: savedEvent.team,
      player: savedEvent.player,
      description: savedEvent.description,
    });
    this.logger.log(`Broadcasted match event update for match ${matchId}`);

    return savedEvent;
  }

  async removeEvent(matchId: string, eventId: string): Promise<void> {
    // Verify match exists
    await this.findOne(matchId);

    // Get the event before deleting to check if it's a goal
    const event = await this.eventRepository.findOne({
      where: { id: eventId, match: { id: matchId } },
    });

    if (!event) {
      throw new NotFoundException(
        `Match event with ID ${eventId} not found for match ${matchId}`,
      );
    }

    const wasGoal = event.type === EventType.GOAL;
    const eventMinute = event.minute;

    // Delete the event
    const result = await this.eventRepository.delete({
      id: eventId,
      match: { id: matchId },
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Match event with ID ${eventId} not found for match ${matchId}`,
      );
    }

    this.logger.log(
      `Deleted match event ${eventId} (${event.type}) for match ${matchId}`,
    );

    // If it was a goal, recalculate scores based on remaining events
    if (wasGoal) {
      // Get all remaining GOAL events for this match
      const remainingGoals = await this.eventRepository.find({
        where: {
          match: { id: matchId },
          type: EventType.GOAL,
        },
      });

      // Count goals by team
      let homeGoals = 0;
      let awayGoals = 0;

      for (const goal of remainingGoals) {
        if (goal.team === Team.HOME) {
          homeGoals++;
        } else {
          awayGoals++;
        }
      }

      // Reload match to get latest data
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: matchId },
      });

      if (!updatedMatch) {
        throw new NotFoundException(`Match with ID ${matchId} not found`);
      }

      // Update scores
      updatedMatch.home_score = homeGoals;
      updatedMatch.away_score = awayGoals;
      await this.matchRepository.save(updatedMatch);

      this.logger.log(
        `Recalculated match scores: ${homeGoals}-${awayGoals} for match ${matchId}`,
      );

      // Broadcast score update to SSE and Socket.IO
      this.matchesGateway.broadcastScoreUpdate(
        matchId,
        homeGoals,
        awayGoals,
        eventMinute,
      );
      this.logger.log(`Broadcasted score update after event deletion`);
    }
  }

  // Match Statistics methods
  async createOrUpdateStatistics(
    matchId: string,
    createStatsDto: CreateMatchStatisticsDto,
  ): Promise<MatchStatistics> {
    // Check match existence and statistics in parallel (optimization)
    const [matchExists, existingStats] = await Promise.all([
      this.matchRepository.exists({ where: { id: matchId } }),
      this.statisticsRepository.findOne({
        where: { match: { id: matchId } },
      }),
    ]);

    if (!matchExists) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    if (existingStats) {
      // Update existing - use Object.assign for cleaner code
      Object.assign(existingStats, {
        home_possession:
          createStatsDto.home_possession ?? existingStats.home_possession,
        away_possession:
          createStatsDto.away_possession ?? existingStats.away_possession,
        home_shots: createStatsDto.home_shots ?? existingStats.home_shots,
        away_shots: createStatsDto.away_shots ?? existingStats.away_shots,
        home_shots_on_target:
          createStatsDto.home_shots_on_target ??
          existingStats.home_shots_on_target,
        away_shots_on_target:
          createStatsDto.away_shots_on_target ??
          existingStats.away_shots_on_target,
        home_passes: createStatsDto.home_passes ?? existingStats.home_passes,
        away_passes: createStatsDto.away_passes ?? existingStats.away_passes,
        home_passes_completed:
          createStatsDto.home_passes_completed ??
          existingStats.home_passes_completed,
        away_passes_completed:
          createStatsDto.away_passes_completed ??
          existingStats.away_passes_completed,
        home_fouls: createStatsDto.home_fouls ?? existingStats.home_fouls,
        away_fouls: createStatsDto.away_fouls ?? existingStats.away_fouls,
        home_corners: createStatsDto.home_corners ?? existingStats.home_corners,
        away_corners: createStatsDto.away_corners ?? existingStats.away_corners,
        home_offsides:
          createStatsDto.home_offsides ?? existingStats.home_offsides,
        away_offsides:
          createStatsDto.away_offsides ?? existingStats.away_offsides,
      });

      const savedStats = await this.statisticsRepository.save(existingStats);
      this.logger.log(
        `Updated statistics for match ${matchId}: ${savedStats.home_possession}-${savedStats.away_possession} possession`,
      );

      // Broadcast statistics update to SSE and Socket.IO
      this.matchesGateway.broadcastStatsUpdate(matchId, {
        homePossession: savedStats.home_possession,
        awayPossession: savedStats.away_possession,
        homeShots: savedStats.home_shots,
        awayShots: savedStats.away_shots,
        homeShotsOnTarget: savedStats.home_shots_on_target,
        awayShotsOnTarget: savedStats.away_shots_on_target,
        homePasses: savedStats.home_passes,
        awayPasses: savedStats.away_passes,
        homePassesCompleted: savedStats.home_passes_completed,
        awayPassesCompleted: savedStats.away_passes_completed,
        homeFouls: savedStats.home_fouls,
        awayFouls: savedStats.away_fouls,
        homeCorners: savedStats.home_corners,
        awayCorners: savedStats.away_corners,
        homeOffsides: savedStats.home_offsides,
        awayOffsides: savedStats.away_offsides,
      });
      this.logger.log(`Broadcasted statistics update for match ${matchId}`);

      return savedStats;
    }

    // Create new - use partial match object instead of loading full entity
    const stats = this.statisticsRepository.create({
      match: { id: matchId } as Match, // Use partial match - TypeORM will handle the relation
      home_possession: createStatsDto.home_possession ?? 50,
      away_possession: createStatsDto.away_possession ?? 50,
      home_shots: createStatsDto.home_shots ?? 0,
      away_shots: createStatsDto.away_shots ?? 0,
      home_shots_on_target: createStatsDto.home_shots_on_target ?? 0,
      away_shots_on_target: createStatsDto.away_shots_on_target ?? 0,
      home_passes: createStatsDto.home_passes ?? 0,
      away_passes: createStatsDto.away_passes ?? 0,
      home_passes_completed: createStatsDto.home_passes_completed ?? 0,
      away_passes_completed: createStatsDto.away_passes_completed ?? 0,
      home_fouls: createStatsDto.home_fouls ?? 0,
      away_fouls: createStatsDto.away_fouls ?? 0,
      home_corners: createStatsDto.home_corners ?? 0,
      away_corners: createStatsDto.away_corners ?? 0,
      home_offsides: createStatsDto.home_offsides ?? 0,
      away_offsides: createStatsDto.away_offsides ?? 0,
    });

    const savedStats = await this.statisticsRepository.save(stats);
    this.logger.log(
      `Created statistics for match ${matchId}: ${savedStats.home_possession}-${savedStats.away_possession} possession`,
    );

    // Broadcast statistics update to SSE and Socket.IO
    this.matchesGateway.broadcastStatsUpdate(matchId, {
      homePossession: savedStats.home_possession,
      awayPossession: savedStats.away_possession,
      homeShots: savedStats.home_shots,
      awayShots: savedStats.away_shots,
      homeShotsOnTarget: savedStats.home_shots_on_target,
      awayShotsOnTarget: savedStats.away_shots_on_target,
      homePasses: savedStats.home_passes,
      awayPasses: savedStats.away_passes,
      homePassesCompleted: savedStats.home_passes_completed,
      awayPassesCompleted: savedStats.away_passes_completed,
      homeFouls: savedStats.home_fouls,
      awayFouls: savedStats.away_fouls,
      homeCorners: savedStats.home_corners,
      awayCorners: savedStats.away_corners,
      homeOffsides: savedStats.home_offsides,
      awayOffsides: savedStats.away_offsides,
    });
    this.logger.log(`Broadcasted statistics update for match ${matchId}`);

    return savedStats;
  }

  async updateStatistics(
    matchId: string,
    updateStatsDto: UpdateMatchStatisticsDto,
  ): Promise<MatchStatistics> {
    // Verify match exists
    await this.findOne(matchId);

    const stats = await this.statisticsRepository.findOne({
      where: { match: { id: matchId } },
    });

    if (!stats) {
      throw new NotFoundException(
        `Match statistics not found for match ${matchId}`,
      );
    }

    // Only update provided fields
    if (updateStatsDto.home_possession !== undefined)
      stats.home_possession = updateStatsDto.home_possession;
    if (updateStatsDto.away_possession !== undefined)
      stats.away_possession = updateStatsDto.away_possession;
    if (updateStatsDto.home_shots !== undefined)
      stats.home_shots = updateStatsDto.home_shots;
    if (updateStatsDto.away_shots !== undefined)
      stats.away_shots = updateStatsDto.away_shots;
    if (updateStatsDto.home_shots_on_target !== undefined)
      stats.home_shots_on_target = updateStatsDto.home_shots_on_target;
    if (updateStatsDto.away_shots_on_target !== undefined)
      stats.away_shots_on_target = updateStatsDto.away_shots_on_target;
    if (updateStatsDto.home_passes !== undefined)
      stats.home_passes = updateStatsDto.home_passes;
    if (updateStatsDto.away_passes !== undefined)
      stats.away_passes = updateStatsDto.away_passes;
    if (updateStatsDto.home_passes_completed !== undefined)
      stats.home_passes_completed = updateStatsDto.home_passes_completed;
    if (updateStatsDto.away_passes_completed !== undefined)
      stats.away_passes_completed = updateStatsDto.away_passes_completed;
    if (updateStatsDto.home_fouls !== undefined)
      stats.home_fouls = updateStatsDto.home_fouls;
    if (updateStatsDto.away_fouls !== undefined)
      stats.away_fouls = updateStatsDto.away_fouls;
    if (updateStatsDto.home_corners !== undefined)
      stats.home_corners = updateStatsDto.home_corners;
    if (updateStatsDto.away_corners !== undefined)
      stats.away_corners = updateStatsDto.away_corners;
    if (updateStatsDto.home_offsides !== undefined)
      stats.home_offsides = updateStatsDto.home_offsides;
    if (updateStatsDto.away_offsides !== undefined)
      stats.away_offsides = updateStatsDto.away_offsides;

    const savedStats = await this.statisticsRepository.save(stats);
    this.logger.log(
      `Updated statistics for match ${matchId}: ${savedStats.home_possession}-${savedStats.away_possession} possession`,
    );

    // Broadcast statistics update to SSE and Socket.IO
    this.matchesGateway.broadcastStatsUpdate(matchId, {
      homePossession: savedStats.home_possession,
      awayPossession: savedStats.away_possession,
      homeShots: savedStats.home_shots,
      awayShots: savedStats.away_shots,
      homeShotsOnTarget: savedStats.home_shots_on_target,
      awayShotsOnTarget: savedStats.away_shots_on_target,
      homePasses: savedStats.home_passes,
      awayPasses: savedStats.away_passes,
      homePassesCompleted: savedStats.home_passes_completed,
      awayPassesCompleted: savedStats.away_passes_completed,
      homeFouls: savedStats.home_fouls,
      awayFouls: savedStats.away_fouls,
      homeCorners: savedStats.home_corners,
      awayCorners: savedStats.away_corners,
      homeOffsides: savedStats.home_offsides,
      awayOffsides: savedStats.away_offsides,
    });
    this.logger.log(`Broadcasted statistics update for match ${matchId}`);

    return savedStats;
  }
}
