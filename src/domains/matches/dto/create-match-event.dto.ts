import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  Min,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { EventType, Team } from '../entities/match-event.entity';

export class CreateMatchEventDto {
  @ApiProperty({ description: 'Event type', enum: EventType })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({ description: 'Minute when event occurred', example: 23 })
  @IsInt()
  @Min(0)
  minute: number;

  @ApiProperty({ description: 'Team', enum: Team })
  @IsEnum(Team)
  team: Team;

  @ApiProperty({
    description: 'Player name',
    required: false,
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  player?: string;

  @ApiProperty({
    description: 'Event description',
    required: false,
    example: 'Goal scored from penalty',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
