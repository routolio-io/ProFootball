import { Entity, Column, OneToMany, OneToOne, RelationId } from 'typeorm';
import { BaseEntity } from '../../../common/base-entity';
import { UseDto } from '../../../common/decorators/use-dto.decorator';
import { MatchDto } from '../dto/match.dto';
import { MatchEvent } from './match-event.entity';
import { MatchStatistics } from './match-statistics.entity';

export enum MatchStatus {
  NOT_STARTED = 'NOT_STARTED',
  FIRST_HALF = 'FIRST_HALF',
  HALF_TIME = 'HALF_TIME',
  SECOND_HALF = 'SECOND_HALF',
  FULL_TIME = 'FULL_TIME',
}

@Entity({ name: 'matches' })
@UseDto(MatchDto)
export class Match extends BaseEntity<MatchDto> {
  @Column('varchar', { length: 255 })
  home_team: string;

  @Column('varchar', { length: 255 })
  away_team: string;

  @Column('int', { default: 0 })
  home_score: number;

  @Column('int', { default: 0 })
  away_score: number;

  @Column('int', { default: 0 })
  minute: number;

  @Column('varchar', { length: 50, default: MatchStatus.NOT_STARTED })
  status: MatchStatus;

  @Column('bigint')
  kickoff_time: number;

  @OneToMany(() => MatchEvent, (event) => event.match)
  events: MatchEvent[];

  @RelationId((match: Match) => match.events)
  event_ids?: string[];

  @OneToOne(() => MatchStatistics, (stats) => stats.match)
  statistics: MatchStatistics;

  @RelationId((match: Match) => match.statistics)
  statistics_id?: string;
}
