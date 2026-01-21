import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MatchSimulatorService } from './match-simulator.service';
import { EventGeneratorService } from './event-generator.service';
import { SimulatorController } from './simulator.controller';
import { Match } from '../matches/entities/match.entity';
import { MatchEvent } from '../matches/entities/match-event.entity';
import { MatchStatistics } from '../matches/entities/match-statistics.entity';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, MatchEvent, MatchStatistics]),
    ScheduleModule,
    MatchesModule,
  ],
  controllers: [SimulatorController],
  providers: [MatchSimulatorService, EventGeneratorService],
  exports: [MatchSimulatorService],
})
export class SimulatorModule {}
