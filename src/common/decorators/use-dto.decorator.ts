import { SetMetadata } from '@nestjs/common';

export const DTO_KEY = 'dto';

export const UseDto = (dto: any) => SetMetadata(DTO_KEY, dto);
