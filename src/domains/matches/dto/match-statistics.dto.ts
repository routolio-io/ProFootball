import { ApiProperty } from '@nestjs/swagger';
import { MatchStatistics } from '../entities/match-statistics.entity';
import { BaseDto } from 'src/common/dto/base.dto';

export class MatchStatisticsDto extends BaseDto {
  @ApiProperty()
  match_id: string;

  @ApiProperty({ description: 'Home team possession percentage' })
  home_possession: number;

  @ApiProperty({ description: 'Away team possession percentage' })
  away_possession: number;

  @ApiProperty()
  home_shots: number;

  @ApiProperty()
  away_shots: number;

  @ApiProperty()
  home_shots_on_target: number;

  @ApiProperty()
  away_shots_on_target: number;

  @ApiProperty()
  home_passes: number;

  @ApiProperty()
  away_passes: number;

  @ApiProperty()
  home_passes_completed: number;

  @ApiProperty()
  away_passes_completed: number;

  @ApiProperty()
  home_fouls: number;

  @ApiProperty()
  away_fouls: number;

  @ApiProperty()
  home_corners: number;

  @ApiProperty()
  away_corners: number;

  @ApiProperty()
  home_offsides: number;

  @ApiProperty()
  away_offsides: number;

  constructor(stats: MatchStatistics) {
    super(stats);
    this.match_id = stats.match_id;
    this.home_possession = stats.home_possession;
    this.away_possession = stats.away_possession;
    this.home_shots = stats.home_shots;
    this.away_shots = stats.away_shots;
    this.home_shots_on_target = stats.home_shots_on_target;
    this.away_shots_on_target = stats.away_shots_on_target;
    this.home_passes = stats.home_passes;
    this.away_passes = stats.away_passes;
    this.home_passes_completed = stats.home_passes_completed;
    this.away_passes_completed = stats.away_passes_completed;
    this.home_fouls = stats.home_fouls;
    this.away_fouls = stats.away_fouls;
    this.home_corners = stats.home_corners;
    this.away_corners = stats.away_corners;
    this.home_offsides = stats.home_offsides;
    this.away_offsides = stats.away_offsides;
  }
}
