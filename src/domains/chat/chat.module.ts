import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatMessage } from './entities/chat-message.entity';
import { Match } from '../matches/entities/match.entity';
import { RedisProvider } from '../../providers/redis.provider';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage, Match])],
  providers: [ChatGateway, ChatService, RedisProvider],
  exports: [TypeOrmModule, ChatService],
})
export class ChatModule {}
