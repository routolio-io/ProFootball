import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { Match } from '../matches/entities/match.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async createMessage(
    matchId: string,
    userId: string | undefined,
    username: string,
    message: string,
  ): Promise<ChatMessage> {
    // Use relation assignment so TypeORM persists the FK correctly
    const chatMessage = this.chatMessageRepository.create({
      match: { id: matchId } as Partial<Match>,
      user_id: userId,
      username,
      message,
    });

    return this.chatMessageRepository.save(chatMessage);
  }

  async getRecentMessages(matchId: string, limit = 50): Promise<ChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { match_id: matchId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
