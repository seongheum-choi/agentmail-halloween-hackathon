import { Injectable, Logger } from '@nestjs/common';
import { HyperspellService } from '../../agent/services/hyperspell.service';
import { ChatGPTService } from '../../agent/services/chatgpt.service';
import { z } from 'zod';

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface SchedulingRequest {
  meetingDuration: number;
  preferredDates?: string[];
  workingHours: {
    start: string;
    end: string;
  };
}

// Zod schema for calendar event extraction
const CalendarEventSchema = z.object({
  startDate: z
    .string()
    .describe('ISO 8601 date string for event start (e.g., 2024-11-01T10:00:00Z)'),
  endDate: z.string().describe('ISO 8601 date string for event end (e.g., 2024-11-01T11:00:00Z)'),
  dateStr: z.string().describe('Date in YYYY-MM-DD format (e.g., 2024-11-01)'),
});

const CalendarEventsListSchema = z.object({
  events: z.array(CalendarEventSchema),
});

type CalendarEvent = z.infer<typeof CalendarEventSchema>;
type CalendarEventsList = z.infer<typeof CalendarEventsListSchema>;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private hyperspellService: HyperspellService,
    private chatGPTService: ChatGPTService,
  ) {}

  async findAvailableSlots(
    request: SchedulingRequest,
    userId: string = 'anonymous',
  ): Promise<TimeSlot[]> {
    this.logger.log('Finding available time slots');

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const calendarQuery = `What are my scheduled events from ${today.toISOString()} to ${nextWeek.toISOString()}?`;

    try {
      const calendarData = await this.hyperspellService.queryCalendar(calendarQuery, userId, true);

      this.logger.debug('Calendar data received:', calendarData);

      const availableSlots = await this.calculateAvailableSlots(calendarData, request);

      return availableSlots;
    } catch (error) {
      this.logger.error(`Failed to query calendar: ${error.message}`, error.stack);
      return this.getDefaultTimeSlots(request);
    }
  }

  async isTimeSlotAvailable(timeSlot: TimeSlot, userId: string = 'anonymous'): Promise<string> {
    this.logger.log(
      `Checking availability for time slot: ${timeSlot.date} ${timeSlot.startTime}-${timeSlot.endTime}`,
    );

    try {
      // First, query calendar to get documents
      const calendarQuery = `What events are scheduled on ${timeSlot.date}?`;
      const calendarResponse = await this.hyperspellService.queryCalendar(
        calendarQuery,
        userId,
        true,
      );

      this.logger.debug('Calendar response:', calendarResponse);

      // Extract and combine all document summaries
      const documents = calendarResponse?.documents || [];
      const summaries = documents
        .map((doc: any) => doc.summary || doc.content || '')
        .filter((summary: string) => summary.trim().length > 0);

      const calendarSummary =
        summaries.length > 0 ? summaries.join('\n\n') : 'No calendar events found for this date';

      this.logger.debug('Combined calendar summaries:', calendarSummary);

      // Now ask GPT to check for conflicts based on the calendar summary
      const conflictCheckPrompt = `Based on the following calendar information, check if there are any conflicts between ${timeSlot.date} ${timeSlot.startTime} and ${timeSlot.date} ${timeSlot.endTime}.

Calendar information:
${calendarSummary}

Question: Are there any conflicts with the time slot ${timeSlot.date} ${timeSlot.startTime} to ${timeSlot.endTime}?`;

      console.log('Sending conflict check prompt to ChatGPT:', conflictCheckPrompt);

      const conflictCheckResult = await this.chatGPTService.sendMessage(
        conflictCheckPrompt,
        [],
        0.3,
        8096,
      );

      this.logger.debug('Conflict check result:', conflictCheckResult);

      return conflictCheckResult;
    } catch (error) {
      this.logger.error(`Failed to check time slot availability: ${error.message}`, error.stack);
      return 'Error: Unable to verify calendar availability';
    }
  }

  private async calculateAvailableSlots(
    calendarData: any,
    request: SchedulingRequest,
  ): Promise<TimeSlot[]> {
    const busySlots = await this.extractBusySlots(calendarData);
    const slots: TimeSlot[] = [];
    const today = new Date();
    const maxSlots = 3;

    for (let i = 1; i <= 7 && slots.length < maxSlots; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }

      const dateStr = date.toISOString().split('T')[0];
      const availableTimeSlotsForDay = this.generateTimeSlotsForDay(
        dateStr,
        request.workingHours,
        request.meetingDuration,
        busySlots,
      );

      slots.push(...availableTimeSlotsForDay);
    }

    return slots.slice(0, maxSlots);
  }

  private async extractBusySlots(
    calendarData: any,
  ): Promise<Map<string, Array<{ start: string; end: string }>>> {
    const busySlots = new Map<string, Array<{ start: string; end: string }>>();

    if (!calendarData?.documents || !Array.isArray(calendarData.documents)) {
      return busySlots;
    }

    // Collect events that failed to parse
    const unparsedEvents: string[] = [];

    for (const doc of calendarData.documents) {
      try {
        const eventData = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;

        if (eventData.start?.dateTime && eventData.end?.dateTime) {
          const startDate = new Date(eventData.start.dateTime);
          const endDate = new Date(eventData.end.dateTime);
          const dateStr = startDate.toISOString().split('T')[0];

          if (!busySlots.has(dateStr)) {
            busySlots.set(dateStr, []);
          }

          busySlots.get(dateStr).push({
            start: this.formatTime(startDate),
            end: this.formatTime(endDate),
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse calendar event directly, will use AI to parse: ${error.message}`,
        );
        // Collect the raw content for AI parsing
        unparsedEvents.push(doc.summary || doc.content || '');
      }
    }

    // If there are unparsed events, use AI to extract structured data
    if (unparsedEvents.length > 0) {
      try {
        const parsedEvents = await this.parseEventsWithAI(unparsedEvents);

        for (const event of parsedEvents) {
          const startDate = new Date(event.startDate);
          const endDate = new Date(event.endDate);
          const dateStr = event.dateStr;

          if (!busySlots.has(dateStr)) {
            busySlots.set(dateStr, []);
          }

          busySlots.get(dateStr).push({
            start: this.formatTime(startDate),
            end: this.formatTime(endDate),
          });
        }

        this.logger.log(`Successfully parsed ${parsedEvents.length} events using AI`);
      } catch (error) {
        this.logger.error(`Failed to parse events with AI: ${error.message}`, error.stack);
      }
    }

    return busySlots;
  }

  private async parseEventsWithAI(rawEvents: string[]): Promise<CalendarEvent[]> {
    const prompt = `You are a calendar event parser. Extract structured event information from the following raw calendar data.

For each event, extract:
- startDate: ISO 8601 formatted start date/time (e.g., "2024-11-01T10:00:00Z")
- endDate: ISO 8601 formatted end date/time (e.g., "2024-11-01T11:00:00Z")
- dateStr: Date in YYYY-MM-DD format (e.g., "2024-11-01")

Raw calendar data:
${rawEvents.map((event, idx) => `Event ${idx + 1}:\n${event}`).join('\n\n')}

Parse all events and return them as a structured list.`;

    console.log('Sending prompt to ChatGPT for event parsing:', prompt);

    const result = await this.chatGPTService.sendMessageWithFormat(
      prompt,
      CalendarEventsListSchema,
      'calendar_events',
      [],
      0.1, // Low temperature for consistent parsing
      2000,
    );

    console.log('Received response from ChatGPT for event parsing:', result);

    return result.events;
  }

  private generateTimeSlotsForDay(
    date: string,
    workingHours: { start: string; end: string },
    meetingDuration: number,
    busySlots: Map<string, Array<{ start: string; end: string }>>,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const busyTimesForDay = busySlots.get(date) || [];

    const workStart = this.timeToMinutes(workingHours.start);
    const workEnd = this.timeToMinutes(workingHours.end);

    for (let currentTime = workStart; currentTime + meetingDuration <= workEnd; currentTime += 60) {
      const slotStart = this.minutesToTime(currentTime);
      const slotEnd = this.minutesToTime(currentTime + meetingDuration);

      if (!this.isSlotBusy(slotStart, slotEnd, busyTimesForDay)) {
        slots.push({
          date,
          startTime: slotStart,
          endTime: slotEnd,
        });
      }
    }

    return slots;
  }

  private isSlotBusy(
    slotStart: string,
    slotEnd: string,
    busyTimes: Array<{ start: string; end: string }>,
  ): boolean {
    const slotStartMinutes = this.timeToMinutes(slotStart);
    const slotEndMinutes = this.timeToMinutes(slotEnd);

    for (const busy of busyTimes) {
      const busyStartMinutes = this.timeToMinutes(busy.start);
      const busyEndMinutes = this.timeToMinutes(busy.end);

      if (slotStartMinutes < busyEndMinutes && slotEndMinutes > busyStartMinutes) {
        return true;
      }
    }

    return false;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private getDefaultTimeSlots(request: SchedulingRequest): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }

      const slot: TimeSlot = {
        date: date.toISOString().split('T')[0],
        startTime: request.workingHours.start || '10:00',
        endTime: this.addMinutesToTime(
          request.workingHours.start || '10:00',
          request.meetingDuration,
        ),
      };

      slots.push(slot);

      if (slots.length >= 3) {
        break;
      }
    }

    return slots;
  }

  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }
}
