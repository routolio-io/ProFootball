import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional } from 'class-validator';

export class UpdateMatchStatisticsDto {
  @ApiProperty({
    description: 'Home team possession percentage',
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  home_possession?: number;

  @ApiProperty({
    description: 'Away team possession percentage',
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  away_possession?: number;

  @ApiProperty({ description: 'Home team shots', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_shots?: number;

  @ApiProperty({ description: 'Away team shots', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_shots?: number;

  @ApiProperty({ description: 'Home team shots on target', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_shots_on_target?: number;

  @ApiProperty({ description: 'Away team shots on target', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_shots_on_target?: number;

  @ApiProperty({ description: 'Home team passes', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_passes?: number;

  @ApiProperty({ description: 'Away team passes', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_passes?: number;

  @ApiProperty({ description: 'Home team completed passes', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_passes_completed?: number;

  @ApiProperty({ description: 'Away team completed passes', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_passes_completed?: number;

  @ApiProperty({ description: 'Home team fouls', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_fouls?: number;

  @ApiProperty({ description: 'Away team fouls', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_fouls?: number;

  @ApiProperty({ description: 'Home team corners', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_corners?: number;

  @ApiProperty({ description: 'Away team corners', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_corners?: number;

  @ApiProperty({ description: 'Home team offsides', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_offsides?: number;

  @ApiProperty({ description: 'Away team offsides', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_offsides?: number;
}
