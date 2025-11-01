import { Injectable, Logger } from '@nestjs/common';
import { HyperspellService } from '../../agent/services/hyperspell.service';

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

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private hyperspellService: HyperspellService) {}

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

      const availableSlots = this.calculateAvailableSlots(calendarData, request);

      return availableSlots;
    } catch (error) {
      this.logger.error(`Failed to query calendar: ${error.message}`, error.stack);
      return this.getDefaultTimeSlots(request);
    }
  }

  async isTimeSlotAvailable(
    timeSlot: TimeSlot,
    userId: string = 'anonymous',
    workingHours: { start: string; end: string } = { start: '09:00', end: '18:00' },
  ): Promise<{ available: boolean; reason?: string }> {
    this.logger.log(`Checking availability for time slot: ${timeSlot.date} ${timeSlot.startTime}-${timeSlot.endTime}`);

    // Validate time slot format
    if (!this.isValidTimeSlot(timeSlot)) {
      return { available: false, reason: 'Invalid time slot format' };
    }

    // Check if the time is in the past
    const slotDateTime = new Date(`${timeSlot.date}T${timeSlot.startTime}`);
    const now = new Date();
    if (slotDateTime < now) {
      return { available: false, reason: 'Time slot is in the past' };
    }

    // Check if it's within working hours
    if (!this.isWithinWorkingHours(timeSlot, workingHours)) {
      return { available: false, reason: 'Time slot is outside working hours' };
    }

    // Check if it's a weekend
    const date = new Date(timeSlot.date);
    if (date.getDay() === 0 || date.getDay() === 6) {
      return { available: false, reason: 'Time slot is on a weekend' };
    }

    // Query calendar for the specific date
    const startOfDay = new Date(timeSlot.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(timeSlot.date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const calendarQuery = `What are my scheduled events from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}?`;
      const calendarData = await this.hyperspellService.queryCalendar(calendarQuery, userId, true);

      this.logger.debug('Calendar data received for availability check:', calendarData);

      const busySlots = this.extractBusySlots(calendarData);
      const busyTimesForDay = busySlots.get(timeSlot.date) || [];

      // Check if the time slot conflicts with any busy times
      const isConflict = this.isSlotBusy(timeSlot.startTime, timeSlot.endTime, busyTimesForDay);

      if (isConflict) {
        return { available: false, reason: 'Time slot conflicts with an existing event' };
      }

      return { available: true };
    } catch (error) {
      this.logger.error(`Failed to check time slot availability: ${error.message}`, error.stack);
      return { available: false, reason: 'Unable to verify calendar availability' };
    }
  }

  private isValidTimeSlot(timeSlot: TimeSlot): boolean {
    if (!timeSlot.date || !timeSlot.startTime || !timeSlot.endTime) {
      return false;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(timeSlot.date)) {
      return false;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(timeSlot.startTime) || !timeRegex.test(timeSlot.endTime)) {
      return false;
    }

    // Validate that end time is after start time
    const startMinutes = this.timeToMinutes(timeSlot.startTime);
    const endMinutes = this.timeToMinutes(timeSlot.endTime);
    if (endMinutes <= startMinutes) {
      return false;
    }

    return true;
  }

  private isWithinWorkingHours(
    timeSlot: TimeSlot,
    workingHours: { start: string; end: string },
  ): boolean {
    const slotStart = this.timeToMinutes(timeSlot.startTime);
    const slotEnd = this.timeToMinutes(timeSlot.endTime);
    const workStart = this.timeToMinutes(workingHours.start);
    const workEnd = this.timeToMinutes(workingHours.end);

    return slotStart >= workStart && slotEnd <= workEnd;
  }

  private calculateAvailableSlots(calendarData: any, request: SchedulingRequest): TimeSlot[] {
    const busySlots = this.extractBusySlots(calendarData);
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

  private extractBusySlots(calendarData: any): Map<string, Array<{ start: string; end: string }>> {
    const busySlots = new Map<string, Array<{ start: string; end: string }>>();

    if (!calendarData?.documents || !Array.isArray(calendarData.documents)) {
      return busySlots;
    }

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
        this.logger.warn(`Failed to parse calendar event: ${error.message}`);
      }
    }

    return busySlots;
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
