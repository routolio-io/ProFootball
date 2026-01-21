import { Entity, Column, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from '../../../common/base-entity';
import { Match } from '../../matches/entities/match.entity';

@Entity({ name: 'chat_messages' })
export class ChatMessage extends BaseEntity<any> {
  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  match: Match;

  @RelationId((message: ChatMessage) => message.match)
  match_id: string;

  @Column('varchar', { length: 255, nullable: true })
  user_id?: string;

  @Column('varchar', { length: 255 })
  username: string;

  @Column('text')
  message: string;
}
