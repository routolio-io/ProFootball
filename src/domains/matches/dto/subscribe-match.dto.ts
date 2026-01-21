import { IsUUID } from 'class-validator';

export class SubscribeMatchDto {
  @IsUUID()
  matchId: string;
}
