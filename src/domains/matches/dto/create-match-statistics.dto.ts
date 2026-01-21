import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateMatchStatisticsDto {
  @ApiProperty({
    description: 'Home team possession percentage',
    example: 55,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  home_possession?: number;

  @ApiProperty({
    description: 'Away team possession percentage',
    example: 45,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  away_possession?: number;

  @ApiProperty({ description: 'Home team shots', example: 12, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_shots?: number;

  @ApiProperty({ description: 'Away team shots', example: 8, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_shots?: number;

  @ApiProperty({
    description: 'Home team shots on target',
    example: 5,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_shots_on_target?: number;

  @ApiProperty({
    description: 'Away team shots on target',
    example: 3,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_shots_on_target?: number;

  @ApiProperty({
    description: 'Home team passes',
    example: 450,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_passes?: number;

  @ApiProperty({
    description: 'Away team passes',
    example: 380,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_passes?: number;

  @ApiProperty({
    description: 'Home team completed passes',
    example: 400,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_passes_completed?: number;

  @ApiProperty({
    description: 'Away team completed passes',
    example: 340,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_passes_completed?: number;

  @ApiProperty({ description: 'Home team fouls', example: 10, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_fouls?: number;

  @ApiProperty({ description: 'Away team fouls', example: 12, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_fouls?: number;

  @ApiProperty({
    description: 'Home team corners',
    example: 6,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_corners?: number;

  @ApiProperty({
    description: 'Away team corners',
    example: 4,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_corners?: number;

  @ApiProperty({
    description: 'Home team offsides',
    example: 2,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  home_offsides?: number;

  @ApiProperty({
    description: 'Away team offsides',
    example: 1,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  away_offsides?: number;
}
