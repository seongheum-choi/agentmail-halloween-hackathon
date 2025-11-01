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
      const calendarData = await this.hyperspellService.queryCalendar(
        calendarQuery,
        userId,
        true,
      );

      this.logger.debug('Calendar data received:', calendarData);

      const availableSlots = this.calculateAvailableSlots(
        calendarData,
        request,
      );

      return availableSlots;
    } catch (error) {
      this.logger.error(`Failed to query calendar: ${error.message}`, error.stack);
      return this.getDefaultTimeSlots(request);
    }
  }

  private calculateAvailableSlots(
    calendarData: any,
    request: SchedulingRequest,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }

      const morning: TimeSlot = {
        date: date.toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
      };

      const afternoon: TimeSlot = {
        date: date.toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
      };

      slots.push(morning, afternoon);

      if (slots.length >= 3) {
        break;
      }
    }

    return slots.slice(0, 3);
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
