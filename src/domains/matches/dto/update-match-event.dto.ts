import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { EventType, Team } from '../entities/match-event.entity';

export class UpdateMatchEventDto {
  @ApiProperty({ description: 'Match ID', required: false })
  @IsUUID()
  @IsOptional()
  match_id?: string;

  @ApiProperty({ description: 'Event type', enum: EventType, required: false })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @ApiProperty({ description: 'Minute when event occurred', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  minute?: number;

  @ApiProperty({ description: 'Team', enum: Team, required: false })
  @IsEnum(Team)
  @IsOptional()
  team?: Team;

  @ApiProperty({ description: 'Player name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  player?: string;

  @ApiProperty({ description: 'Event description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
