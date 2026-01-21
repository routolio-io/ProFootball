import { IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';

export class JoinChatDto {
  @IsUUID()
  matchId: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  userId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  username?: string;
}
