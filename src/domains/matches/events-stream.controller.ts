import { Controller, Get, Param, Logger, Headers } from '@nestjs/common';
import { Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiHeader } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { MatchesService } from './matches.service';
import { MatchEventsService } from './match-events.service';

@ApiTags('Matches')
@Controller({ path: 'matches', version: '1' })
export class EventsStreamController {
  private readonly logger = new Logger(EventsStreamController.name);
  private readonly activeStreams = new Map<string, number>();

  constructor(
    private readonly matchesService: MatchesService,
    private readonly matchEventsService: MatchEventsService,
  ) {}

  @Get(':id/events/stream')
  @Sse('events')
  @ApiOperation({
    summary: 'Stream match events via Server-Sent Events (SSE)',
  })
  @ApiParam({ name: 'id', description: 'Match UUID' })
  @ApiHeader({
    name: 'last-event-id',
    description:
      'Optional: Last event ID for reconnection support. Stream works without it.',
    required: false,
  })
  async streamMatchEvents(
    @Param('id') matchId: string,
    @Headers('last-event-id') lastEventId?: string,
  ): Promise<Observable<MessageEvent>> {
    // Verify match exists - this will throw NotFoundException if match doesn't exist
    // The exception will be caught by the exception filter and return 404
    await this.matchesService.findOne(matchId);

    this.logger.log(`SSE stream started for match ${matchId}`);

    // Get event stream for this match
    const eventSubject = this.matchEventsService.getEventStream(matchId);

    // Track active streams
    const streamCount = this.activeStreams.get(matchId) || 0;
    this.activeStreams.set(matchId, streamCount + 1);

    // Create observable from subject with cleanup on disconnect
    // NestJS @Sse() automatically handles client disconnection by unsubscribing
    // The finalize operator will be called when the subscription ends
    const eventStream$ = eventSubject.pipe(
      map((event) => ({
        id: event.id,
        type: event.type,
        data: JSON.stringify(event.data),
      })),
      finalize(() => {
        // Cleanup when stream ends (client disconnects or stream completes)
        this.logger.log(`SSE stream closed for match ${matchId}`);

        // Decrement stream count
        const currentCount = this.activeStreams.get(matchId) || 0;
        if (currentCount <= 1) {
          this.activeStreams.delete(matchId);
          // Optionally clean up the event stream if no more listeners
          // this.matchEventsService.removeEventStream(matchId);
        } else {
          this.activeStreams.set(matchId, currentCount - 1);
        }
      }),
    );

    // Last-Event-ID is optional - used for reconnection support
    // The stream works fine without it, it just helps clients catch up on missed events
    if (lastEventId) {
      this.logger.debug(
        `Reconnection with Last-Event-ID: ${lastEventId} (optional - stream works without it)`,
      );
      // In a production system, you'd fetch events after this ID
    }

    // Note: With @Sse(), NestJS automatically handles:
    // - Setting Content-Type: text/event-stream
    // - Setting Cache-Control: no-cache
    // - Setting Connection: keep-alive
    // - Handling client disconnection
    // The finalize operator will be called when the client disconnects

    return eventStream$;
  }
}
