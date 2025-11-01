import { Injectable, Logger } from '@nestjs/common';
import {
  EmailAction,
  EmailGenerationRequest,
  OfferEmailContext,
  ConfirmEmailContext,
  CounterOfferEmailContext,
} from '../types/action.types';

@Injectable()
export class EmailResponseGeneratorService {
  private readonly logger = new Logger(EmailResponseGeneratorService.name);

  generateEmail(request: EmailGenerationRequest): string {
    this.logger.log(`Generating email for action: ${request.action}`);

    switch (request.action) {
      case EmailAction.OFFER:
        return this.generateOfferEmail(
          request.context as OfferEmailContext,
          request.recipientName,
          request.senderName,
          request.meetingPurpose,
        );
      case EmailAction.CONFIRM:
        return this.generateConfirmEmail(
          request.context as ConfirmEmailContext,
          request.recipientName,
          request.senderName,
          request.meetingPurpose,
        );
      case EmailAction.COUNTEROFFER:
        return this.generateCounterOfferEmail(
          request.context as CounterOfferEmailContext,
          request.recipientName,
          request.senderName,
          request.meetingPurpose,
        );
      default:
        throw new Error(`Unsupported action: ${request.action}`);
    }
  }

  private generateOfferEmail(
    context: OfferEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
  ): string {
    const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
    const purposeLine = meetingPurpose
      ? `regarding ${meetingPurpose}`
      : 'to discuss further';

    const timeSlots = context.availableTimeSlots
      .map((slot, index) => {
        const formattedDate = this.formatDateForEmail(slot.date);
        const timeRange = `${slot.startTime} - ${slot.endTime}`;
        return `${index + 1}. ${formattedDate} at ${timeRange}`;
      })
      .join('\n');

    const signature = senderName ? `\n\nBest regards,\n${senderName}` : '';

    return `${greeting}

Thank you for your interest in scheduling a meeting ${purposeLine}.

I would like to propose the following time slots for our meeting:

${timeSlots}

Please let me know which time works best for you, or feel free to suggest an alternative if none of these options are suitable.

I look forward to hearing from you.${signature}`;
  }

  private generateConfirmEmail(
    context: ConfirmEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
  ): string {
    const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
    const purposeLine = meetingPurpose ? ` ${meetingPurpose}` : '';

    const formattedDate = this.formatDateForEmail(context.confirmedTimeSlot.date);
    const timeRange = `${context.confirmedTimeSlot.startTime} - ${context.confirmedTimeSlot.endTime}`;

    const signature = senderName ? `\n\nBest regards,\n${senderName}` : '';

    return `${greeting}

Thank you for confirming the meeting${purposeLine}.

I am pleased to confirm our meeting scheduled for:

Date: ${formattedDate}
Time: ${timeRange}

I look forward to meeting with you. If you need to make any changes, please don't hesitate to let me know.${signature}`;
  }

  private generateCounterOfferEmail(
    context: CounterOfferEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
  ): string {
    const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
    const purposeLine = meetingPurpose
      ? ` regarding ${meetingPurpose}`
      : '';

    const proposedDate = this.formatDateForEmail(context.proposedTimeSlot.date);
    const proposedTime = `${context.proposedTimeSlot.startTime} - ${context.proposedTimeSlot.endTime}`;

    const alternativeSlots = context.alternativeTimeSlots
      .map((slot, index) => {
        const formattedDate = this.formatDateForEmail(slot.date);
        const timeRange = `${slot.startTime} - ${slot.endTime}`;
        return `${index + 1}. ${formattedDate} at ${timeRange}`;
      })
      .join('\n');

    const signature = senderName ? `\n\nBest regards,\n${senderName}` : '';

    return `${greeting}

Thank you for your message${purposeLine}.

Unfortunately, I am not available on ${proposedDate} at ${proposedTime}. However, I would be happy to meet at one of the following alternative times:

${alternativeSlots}

Please let me know if any of these times work for you, or feel free to suggest another time that fits your schedule.

I look forward to finding a suitable time for our meeting.${signature}`;
  }

  private formatDateForEmail(dateString: string): string {
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      this.logger.warn(`Failed to format date: ${dateString}`);
      return dateString;
    }
  }
}
