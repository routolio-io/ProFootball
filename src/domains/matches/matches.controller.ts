import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { MatchDto } from './dto/match.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { CreateMatchEventDto } from './dto/create-match-event.dto';
import { UpdateMatchEventDto } from './dto/update-match-event.dto';
import { CreateMatchStatisticsDto } from './dto/create-match-statistics.dto';
import { UpdateMatchStatisticsDto } from './dto/update-match-statistics.dto';
import { MatchEventDto } from './dto/match-event.dto';
import { MatchStatisticsDto } from './dto/match-statistics.dto';

@ApiTags('Matches')
@Controller({ path: 'matches', version: '1' })
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new match' })
  @ApiBody({ type: CreateMatchDto })
  @ApiCreatedResponse({ description: 'Match created', type: MatchDto })
  async create(
    @Body() createMatchDto: CreateMatchDto,
  ): Promise<{ data: MatchDto }> {
    const match = await this.matchesService.create(createMatchDto);
    return { data: match.toDto() };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all matches' })
  @ApiOkResponse({ description: 'List of matches', type: [MatchDto] })
  async findAll(): Promise<{ data: MatchDto[] }> {
    const matches = await this.matchesService.findAll();
    return { data: MatchDto.collection(matches) };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get match by ID' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiOkResponse({ description: 'Match details', type: MatchDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: MatchDto }> {
    const match = await this.matchesService.findOne(id);
    return { data: match.toDto() };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a match' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiBody({ type: UpdateMatchDto })
  @ApiOkResponse({ description: 'Match updated', type: MatchDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMatchDto: UpdateMatchDto,
  ): Promise<{ data: MatchDto }> {
    const match = await this.matchesService.update(id, updateMatchDto);
    return { data: match.toDto() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a match' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiNoContentResponse({ description: 'Match deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.matchesService.remove(id);
  }

  // Match Events endpoints
  @Post(':id/events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a match event' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiBody({ type: CreateMatchEventDto })
  @ApiCreatedResponse({
    description: 'Match event created',
    type: MatchEventDto,
  })
  async createEvent(
    @Param('id', ParseUUIDPipe) matchId: string,
    @Body() createEventDto: CreateMatchEventDto,
  ): Promise<{ data: MatchEventDto }> {
    const event = await this.matchesService.createEvent(
      matchId,
      createEventDto,
    );
    return { data: event.toDto() };
  }

  @Put(':id/events/:eventId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a match event' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiBody({ type: UpdateMatchEventDto })
  @ApiOkResponse({ description: 'Match event updated', type: MatchEventDto })
  async updateEvent(
    @Param('id', ParseUUIDPipe) matchId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() updateEventDto: UpdateMatchEventDto,
  ): Promise<{ data: MatchEventDto }> {
    const event = await this.matchesService.updateEvent(
      matchId,
      eventId,
      updateEventDto,
    );
    return { data: event.toDto() };
  }

  @Delete(':id/events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a match event' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiNoContentResponse({ description: 'Match event deleted' })
  async removeEvent(
    @Param('id', ParseUUIDPipe) matchId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<void> {
    await this.matchesService.removeEvent(matchId, eventId);
  }

  // Match Statistics endpoints
  @Post(':id/statistics')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update match statistics' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiBody({ type: CreateMatchStatisticsDto })
  @ApiCreatedResponse({
    description: 'Match statistics created/updated',
    type: MatchStatisticsDto,
  })
  async createOrUpdateStatistics(
    @Param('id', ParseUUIDPipe) matchId: string,
    @Body() createStatsDto: CreateMatchStatisticsDto,
  ): Promise<{ data: MatchStatisticsDto }> {
    const stats = await this.matchesService.createOrUpdateStatistics(
      matchId,
      createStatsDto,
    );
    return { data: stats.toDto() };
  }

  @Put(':id/statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update match statistics' })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiBody({ type: UpdateMatchStatisticsDto })
  @ApiOkResponse({
    description: 'Match statistics updated',
    type: MatchStatisticsDto,
  })
  async updateStatistics(
    @Param('id', ParseUUIDPipe) matchId: string,
    @Body() updateStatsDto: UpdateMatchStatisticsDto,
  ): Promise<{ data: MatchStatisticsDto }> {
    const stats = await this.matchesService.updateStatistics(
      matchId,
      updateStatsDto,
    );
    return { data: stats.toDto() };
  }
}
