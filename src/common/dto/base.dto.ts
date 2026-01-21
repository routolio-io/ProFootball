import { ApiProperty } from '@nestjs/swagger';

type BaseEntityLike = {
  id: string;
  created_at: number;
  updated_at?: number;
};

export abstract class BaseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Creation timestamp (unix)',
    example: 1700000000,
  })
  created_at: number;

  @ApiProperty({
    description: 'Last update timestamp (unix)',
    example: 1700000000,
    required: false,
  })
  updated_at?: number;

  constructor(entity: BaseEntityLike, options?: { excludeFields?: boolean }) {
    if (!options?.excludeFields) {
      this.id = entity.id;
      this.created_at = entity.created_at;
      this.updated_at = entity.updated_at;
    }
  }
}
