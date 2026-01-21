import {
  Controller,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { MatchSimulatorService } from './match-simulator.service';

@ApiTags('Simulator')
@Controller({ path: 'simulator', version: '1' })
export class SimulatorController {
  constructor(private readonly simulatorService: MatchSimulatorService) {}

  @Post('matches/:id/start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start simulating a match' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiCreatedResponse({ description: 'Match simulation started' })
  async startMatch(@Param('id', ParseUUIDPipe) id: string): Promise<{
    data: { matchId: string; message: string };
  }> {
    if (this.simulatorService.isMatchActive(id)) {
      return {
        data: {
          matchId: id,
          message: 'Match is already being simulated',
        },
      };
    }

    await this.simulatorService.startMatch(id);

    return {
      data: {
        matchId: id,
        message: 'Match simulation started',
      },
    };
  }

  @Delete('matches/:id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop simulating a match' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiOkResponse({ description: 'Match simulation stopped' })
  async stopMatch(@Param('id', ParseUUIDPipe) id: string): Promise<{
    data: { matchId: string; message: string };
  }> {
    if (!this.simulatorService.isMatchActive(id)) {
      throw new NotFoundException(`Match ${id} is not being simulated`);
    }

    await this.simulatorService.stopMatch(id);

    return {
      data: {
        matchId: id,
        message: 'Match simulation stopped',
      },
    };
  }

  @Post('matches/start-multiple')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start simulating 3-5 matches (for demo/testing)',
    description:
      'Finds matches with status NOT_STARTED and starts simulating up to 5 of them. Returns the list of match IDs that were started.',
  })
  @ApiCreatedResponse({ description: 'Matches simulation started' })
  async startMultipleMatches(): Promise<{
    data: { matchIds: string[]; message: string };
  }> {
    const startedMatchIds = await this.simulatorService.startMultipleMatches(5);
    const activeMatches = this.simulatorService.getActiveMatches();

    return {
      data: {
        matchIds: startedMatchIds,
        message:
          startedMatchIds.length > 0
            ? `Started simulating ${startedMatchIds.length} match(es). Total active matches: ${activeMatches.length}`
            : `No matches available to start. Currently simulating ${activeMatches.length} match(es). Use POST /api/simulator/matches/:id/start to start a specific match.`,
      },
    };
  }
}
