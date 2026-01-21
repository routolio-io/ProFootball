import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { EventsStreamController } from './events-stream.controller';
import { MatchEventsService } from './match-events.service';
import { Match } from './entities/match.entity';
import { MatchEvent } from './entities/match-event.entity';
import { MatchStatistics } from './entities/match-statistics.entity';
import { MatchesGateway } from './matches.gateway';
import { RedisProvider } from '../../providers/redis.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchEvent, MatchStatistics])],
  providers: [
    MatchesService,
    MatchesGateway,
    RedisProvider,
    MatchEventsService,
  ],
  // Order matters: more specific routes first
  controllers: [EventsStreamController, MatchesController],
  exports: [MatchesService, TypeOrmModule, MatchesGateway],
})
export class MatchesModule {}
