import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../../common/dto/base.dto';
import { Match, MatchStatus } from '../entities/match.entity';
import { MatchEventDto } from './match-event.dto';
import { MatchStatisticsDto } from './match-statistics.dto';

export class MatchDto extends BaseDto {
  @ApiProperty({ description: 'Home team name' })
  home_team: string;

  @ApiProperty({ description: 'Away team name' })
  away_team: string;

  @ApiProperty({ description: 'Home team score' })
  home_score: number;

  @ApiProperty({ description: 'Away team score' })
  away_score: number;

  @ApiProperty({ description: 'Current minute' })
  minute: number;

  @ApiProperty({ description: 'Match status', enum: MatchStatus })
  status: MatchStatus;

  @ApiProperty({ description: 'Kickoff timestamp (unix)' })
  kickoff_time: number;

  @ApiProperty({ type: [MatchEventDto], required: false })
  events?: MatchEventDto[];

  @ApiProperty({ type: MatchStatisticsDto, required: false })
  statistics?: MatchStatisticsDto;

  constructor(match: Match) {
    super(match);
    this.home_team = match.home_team;
    this.away_team = match.away_team;
    this.home_score = match.home_score;
    this.away_score = match.away_score;
    this.minute = match.minute;
    this.status = match.status;
    this.kickoff_time = match.kickoff_time;

    // Convert relations to DTOs with conditional checks
    if (match.events && Array.isArray(match.events)) {
      this.events = MatchEventDto.collection(match.events);
    }

    if (match.statistics) {
      this.statistics = new MatchStatisticsDto(match.statistics);
    }
  }

  static collection(matches: Match[]): MatchDto[] {
    return matches.map((match) => match.toDto());
  }
}
