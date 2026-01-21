import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface MatchEventData {
  id: string;
  type: 'score_update' | 'match_event' | 'stats_update' | 'status_update';
  data: any;
}

@Injectable()
export class MatchEventsService {
  private readonly eventSubjects = new Map<string, Subject<MatchEventData>>();

  /**
   * Get or create a subject for a specific match
   */
  getEventStream(matchId: string): Subject<MatchEventData> {
    if (!this.eventSubjects.has(matchId)) {
      this.eventSubjects.set(matchId, new Subject<MatchEventData>());
    }
    return this.eventSubjects.get(matchId)!;
  }

  /**
   * Emit an event for a specific match
   * Creates the subject if it doesn't exist (so events aren't lost)
   */
  emitEvent(matchId: string, event: MatchEventData) {
    const subject = this.getEventStream(matchId); // This creates the subject if it doesn't exist
    subject.next(event);
  }

  /**
   * Clean up event stream for a match (when no more listeners)
   */
  removeEventStream(matchId: string) {
    const subject = this.eventSubjects.get(matchId);
    if (subject) {
      subject.complete();
      this.eventSubjects.delete(matchId);
    }
  }
}
