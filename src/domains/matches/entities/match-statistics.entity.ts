import { Entity, Column, OneToOne, JoinColumn, RelationId } from 'typeorm';
import { BaseEntity } from '../../../common/base-entity';
import { Match } from './match.entity';
import { UseDto } from 'src/common/decorators/use-dto.decorator';
import { MatchStatisticsDto } from '../dto/match-statistics.dto';

@Entity({ name: 'match_statistics' })
@UseDto(MatchStatisticsDto)
export class MatchStatistics extends BaseEntity<MatchStatisticsDto> {
  @OneToOne(() => Match, (match) => match.statistics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @RelationId((stats: MatchStatistics) => stats.match)
  match_id: string;

  @Column('int', { default: 50 })
  home_possession: number;

  @Column('int', { default: 50 })
  away_possession: number;

  @Column('int', { default: 0 })
  home_shots: number;

  @Column('int', { default: 0 })
  away_shots: number;

  @Column('int', { default: 0 })
  home_shots_on_target: number;

  @Column('int', { default: 0 })
  away_shots_on_target: number;

  @Column('int', { default: 0 })
  home_passes: number;

  @Column('int', { default: 0 })
  away_passes: number;

  @Column('int', { default: 0 })
  home_passes_completed: number;

  @Column('int', { default: 0 })
  away_passes_completed: number;

  @Column('int', { default: 0 })
  home_fouls: number;

  @Column('int', { default: 0 })
  away_fouls: number;

  @Column('int', { default: 0 })
  home_corners: number;

  @Column('int', { default: 0 })
  away_corners: number;

  @Column('int', { default: 0 })
  home_offsides: number;

  @Column('int', { default: 0 })
  away_offsides: number;
}
