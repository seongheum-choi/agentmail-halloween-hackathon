import { Injectable, Logger } from '@nestjs/common';
import * as ical from 'ical-generator';

export interface CalendarEventDetails {
  summary: string;
  description: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizer: {
    name: string;
    email: string;
  };
  attendees: Array<{
    name: string;
    email: string;
  }>;
}

@Injectable()
export class CalendarInviteService {
  private readonly logger = new Logger(CalendarInviteService.name);

  generateICS(eventDetails: CalendarEventDetails): string {
    this.logger.log(`Generating ICS for event: ${eventDetails}`);

    const cal = new ical.ICalCalendar({
      name: 'AgentMail AI',
    });

    const uid = `evt-${Date.now()}@agentmail.com`;

    cal.createEvent({
      id: uid,
      start: eventDetails.startTime,
      end: eventDetails.endTime,
      summary: eventDetails.summary,
      description: eventDetails.description,
      location: eventDetails.location || 'To be determined',
      organizer: {
        name: eventDetails.organizer.name,
        email: eventDetails.organizer.email,
      },
      attendees: eventDetails.attendees.map((attendee) => ({
        name: attendee.name,
        email: attendee.email,
        rsvp: true,
        partstat: 'NEEDS-ACTION' as any,
      })),
    });

    return cal.toString();
  }
}
