import { ApiProperty } from '@nestjs/swagger';
import { MatchEvent, EventType, Team } from '../entities/match-event.entity';
import { BaseDto } from '../../../common/dto/base.dto';

export class MatchEventDto extends BaseDto {
  @ApiProperty({ description: 'Match ID' })
  match_id: string;

  @ApiProperty({ description: 'Event type', enum: EventType })
  type: EventType;

  @ApiProperty({ description: 'Minute when event occurred' })
  minute: number;

  @ApiProperty({ description: 'Team', enum: Team })
  team: Team;

  @ApiProperty({ description: 'Player name', required: false })
  player?: string;

  @ApiProperty({ description: 'Event description', required: false })
  description?: string;

  constructor(event: MatchEvent) {
    super(event);
    this.match_id = event.match_id;
    this.type = event.type;
    this.minute = event.minute;
    this.team = event.team;
    this.player = event.player;
    this.description = event.description;
  }

  static collection(events: MatchEvent[]): MatchEventDto[] {
    return events.map((event) => new MatchEventDto(event));
  }
}
