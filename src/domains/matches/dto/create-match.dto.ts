import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { MatchStatus } from '../entities/match.entity';

export class CreateMatchDto {
  @ApiProperty({ description: 'Home team name', example: 'Arsenal' })
  @IsString()
  @IsNotEmpty()
  home_team: string;

  @ApiProperty({ description: 'Away team name', example: 'Chelsea' })
  @IsString()
  @IsNotEmpty()
  away_team: string;

  @ApiProperty({ description: 'Home team score', example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_score?: number;

  @ApiProperty({ description: 'Away team score', example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_score?: number;

  @ApiProperty({ description: 'Current minute', example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  minute?: number;

  @ApiProperty({
    description: 'Match status',
    enum: MatchStatus,
    required: false,
  })
  @IsEnum(MatchStatus)
  @IsOptional()
  status?: MatchStatus;

  @ApiProperty({ description: 'Kickoff timestamp (unix)', example: 1704067200 })
  @IsInt()
  @Min(0)
  kickoff_time: number;
}
