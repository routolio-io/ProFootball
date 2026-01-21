import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsInt, Min, IsOptional } from 'class-validator';
import { MatchStatus } from '../entities/match.entity';

export class UpdateMatchDto {
  @ApiProperty({ description: 'Home team name', required: false })
  @IsString()
  @IsOptional()
  home_team?: string;

  @ApiProperty({ description: 'Away team name', required: false })
  @IsString()
  @IsOptional()
  away_team?: string;

  @ApiProperty({ description: 'Home team score', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_score?: number;

  @ApiProperty({ description: 'Away team score', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_score?: number;

  @ApiProperty({ description: 'Current minute', required: false })
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

  @ApiProperty({ description: 'Kickoff timestamp (unix)', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  kickoff_time?: number;
}
