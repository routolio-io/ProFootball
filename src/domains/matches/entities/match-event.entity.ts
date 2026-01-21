import { Entity, Column, ManyToOne, JoinColumn, RelationId } from 'typeorm';
import { BaseEntity } from '../../../common/base-entity';
import { Match } from './match.entity';
import { UseDto } from 'src/common/decorators/use-dto.decorator';
import { MatchEventDto } from '../dto/match-event.dto';

export enum EventType {
  GOAL = 'GOAL',
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  SUBSTITUTION = 'SUBSTITUTION',
  FOUL = 'FOUL',
  SHOT = 'SHOT',
}

export enum Team {
  HOME = 'HOME',
  AWAY = 'AWAY',
}

@Entity({ name: 'match_events' })
@UseDto(MatchEventDto)
export class MatchEvent extends BaseEntity<MatchEventDto> {
  @ManyToOne(() => Match, (match) => match.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @RelationId((event: MatchEvent) => event.match)
  match_id: string;

  @Column('varchar', { length: 50 })
  type: EventType;

  @Column('int')
  minute: number;

  @Column('varchar', { length: 10 })
  team: Team;

  @Column('varchar', { length: 255, nullable: true })
  player?: string;

  @Column('text', { nullable: true })
  description?: string;
}
