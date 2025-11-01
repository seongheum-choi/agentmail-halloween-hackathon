import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService, SchedulingRequest } from './scheduler.service';
import { HyperspellService } from '../../agent/services/hyperspell.service';
import { Logger } from '@nestjs/common';

describe('SchedulerService', () => {
  let service: SchedulerService;

  const mockHyperspellService = {
    queryCalendar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: HyperspellService,
          useValue: mockHyperspellService,
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAvailableSlots', () => {
    it('should return available slots when no calendar events exist', async () => {
      const request: SchedulingRequest = {
        meetingDuration: 60,
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      };

      mockHyperspellService.queryCalendar.mockResolvedValue({
        answer: 'No events found',
        documents: [],
      });

      const slots = await service.findAvailableSlots(request, 'test-user');

      expect(slots.length).toBeGreaterThan(0);
      expect(slots.length).toBeLessThanOrEqual(3);
      expect(slots[0]).toHaveProperty('date');
      expect(slots[0]).toHaveProperty('startTime');
      expect(slots[0]).toHaveProperty('endTime');
    });

    it('should exclude busy slots from calendar events', async () => {
      const request: SchedulingRequest = {
        meetingDuration: 60,
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const busyStart = new Date(tomorrow);
      busyStart.setHours(10, 0, 0, 0);
      const busyEnd = new Date(tomorrow);
      busyEnd.setHours(11, 0, 0, 0);

      mockHyperspellService.queryCalendar.mockResolvedValue({
        answer: 'You have one meeting tomorrow',
        documents: [
          {
            title: 'Busy Meeting',
            content: JSON.stringify({
              start: { dateTime: busyStart.toISOString() },
              end: { dateTime: busyEnd.toISOString() },
            }),
            source: 'google_calendar',
          },
        ],
      });

      const slots = await service.findAvailableSlots(request, 'test-user');

      const busySlot = slots.find(
        (slot) => slot.date === tomorrow.toISOString().split('T')[0] && slot.startTime === '10:00',
      );

      expect(busySlot).toBeUndefined();
    });

    it('should handle calendar query errors and return default slots', async () => {
      const request: SchedulingRequest = {
        meetingDuration: 60,
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      };

      mockHyperspellService.queryCalendar.mockRejectedValue(new Error('Calendar API error'));

      const slots = await service.findAvailableSlots(request, 'test-user');

      expect(slots.length).toBeGreaterThan(0);
      expect(slots.length).toBeLessThanOrEqual(3);
    });

    it('should respect working hours when generating slots', async () => {
      const request: SchedulingRequest = {
        meetingDuration: 60,
        workingHours: {
          start: '14:00',
          end: '16:00',
        },
      };

      mockHyperspellService.queryCalendar.mockResolvedValue({
        answer: 'No events found',
        documents: [],
      });

      const slots = await service.findAvailableSlots(request, 'test-user');

      slots.forEach((slot) => {
        const startHour = parseInt(slot.startTime.split(':')[0]);
        const endHour = parseInt(slot.endTime.split(':')[0]);
        expect(startHour).toBeGreaterThanOrEqual(14);
        expect(endHour).toBeLessThanOrEqual(16);
      });
    });

    it('should handle malformed calendar event data gracefully', async () => {
      const request: SchedulingRequest = {
        meetingDuration: 60,
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      };

      mockHyperspellService.queryCalendar.mockResolvedValue({
        answer: 'Events with invalid data',
        documents: [
          {
            title: 'Invalid Event',
            content: 'not valid json',
            source: 'google_calendar',
          },
          {
            title: 'Missing Time Data',
            content: JSON.stringify({
              summary: 'Event without times',
            }),
            source: 'google_calendar',
          },
        ],
      });

      const slots = await service.findAvailableSlots(request, 'test-user');

      expect(slots.length).toBeGreaterThan(0);
    });

    it('should skip weekends when generating slots', async () => {
      const request: SchedulingRequest = {
        meetingDuration: 60,
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      };

      mockHyperspellService.queryCalendar.mockResolvedValue({
        answer: 'No events found',
        documents: [],
      });

      const slots = await service.findAvailableSlots(request, 'test-user');

      slots.forEach((slot) => {
        const [year, month, day] = slot.date.split('-').map(Number);
        const slotDate = new Date(year, month - 1, day);
        const dayOfWeek = slotDate.getDay();
        expect(dayOfWeek).not.toBe(0);
        expect(dayOfWeek).not.toBe(6);
      });
    });

    it('should return at most 3 available slots', async () => {
      const request: SchedulingRequest = {
        meetingDuration: 60,
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      };

      mockHyperspellService.queryCalendar.mockResolvedValue({
        answer: 'No events found',
        documents: [],
      });

      const slots = await service.findAvailableSlots(request, 'test-user');

      expect(slots.length).toBeLessThanOrEqual(3);
    });

    it('should handle calendar data with object content directly', async () => {
      const request: SchedulingRequest = {
        meetingDuration: 60,
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const busyStart = new Date(tomorrow);
      busyStart.setHours(10, 0, 0, 0);
      const busyEnd = new Date(tomorrow);
      busyEnd.setHours(11, 0, 0, 0);

      mockHyperspellService.queryCalendar.mockResolvedValue({
        answer: 'You have one meeting tomorrow',
        documents: [
          {
            title: 'Busy Meeting',
            content: {
              start: { dateTime: busyStart.toISOString() },
              end: { dateTime: busyEnd.toISOString() },
            },
            source: 'google_calendar',
          },
        ],
      });

      const slots = await service.findAvailableSlots(request, 'test-user');

      expect(slots.length).toBeGreaterThan(0);
      const busySlot = slots.find(
        (slot) => slot.date === tomorrow.toISOString().split('T')[0] && slot.startTime === '10:00',
      );
      expect(busySlot).toBeUndefined();
    });
  });
});
