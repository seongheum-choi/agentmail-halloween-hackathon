import { Injectable, Logger } from '@nestjs/common';
import {
  EmailAction,
  EmailGenerationRequest,
  OfferEmailContext,
  ConfirmEmailContext,
  CounterOfferEmailContext,
  CheckTimeEmailContext,
} from '../types/action.types';
import { ChatGPTService } from '../../agent/services/chatgpt.service';
import { z } from 'zod';

const EmailResponseSchema = z.object({
  subject: z.string().describe('The email subject line'),
  emailContent: z.string().describe('The email body content'),
});

@Injectable()
export class EmailResponseGeneratorService {
  private readonly logger = new Logger(EmailResponseGeneratorService.name);

  constructor(private readonly chatGPTService: ChatGPTService) {}

  async generateEmail(
    request: EmailGenerationRequest,
    threadContext: any = null,
  ): Promise<{ emailContent: string; subject: string }> {
    this.logger.log(`Generating email for action: ${request.action}`);

    switch (request.action) {
      case EmailAction.OFFER:
        return this.generateOfferEmail(
          request.context as OfferEmailContext,
          request.recipientName,
          request.senderName,
          request.meetingPurpose,
          threadContext,
        );
      case EmailAction.CONFIRM:
        return this.generateConfirmEmail(
          request.context as ConfirmEmailContext,
          request.recipientName,
          request.senderName,
          request.meetingPurpose,
          threadContext,
        );
      case EmailAction.COUNTEROFFER:
        return this.generateCounterOfferEmail(
          request.context as CounterOfferEmailContext,
          request.recipientName,
          request.senderName,
          request.meetingPurpose,
          threadContext,
        );
      case EmailAction.CHECK_TIME:
        return this.generateCheckTimeEmail(
          request.context as CheckTimeEmailContext,
          request.recipientName,
          request.senderName,
          request.meetingPurpose,
          threadContext,
        );
      default:
        throw new Error(`Unsupported action: ${request.action}`);
    }
  }

  private async generateOfferEmail(
    context: OfferEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
    threadContext: any = null,
  ): Promise<{ emailContent: string; subject: string }> {
    const timeSlots = context.availableTimeSlots
      .map((slot, index) => {
        const formattedDate = this.formatDateForEmail(slot.date);
        const timeRange = `${slot.startTime} - ${slot.endTime}`;
        return `${index + 1}. ${formattedDate} at ${timeRange}`;
      })
      .join('\n');

    const systemMessage = {
      role: 'system' as const,
      content: `You are a professional email assistant. Generate a polite and professional email to offer meeting time slots.

Rules:
- Use appropriate greeting based on recipient name (formal if name provided, casual if not)
- Be professional and courteous
- Clearly present the available time slots
- Ask the recipient to choose or suggest alternatives
- Include appropriate closing and signature if sender name is provided
- Keep the tone warm but professional
- DO NOT use any special formatting like bold (**text**) or markdown
- If thread history is provided, reference the conversation context naturally
- Create a concise and professional subject line based on the meeting purpose`,
    };

    let userMessage = `Generate an email with subject and body for the following information:

Action: Offer meeting time slots
${recipientName ? `Recipient Name: ${recipientName}` : 'Recipient: (no specific name)'}
${senderName ? `Sender Name: ${senderName}` : 'Sender: (no specific name)'}
${meetingPurpose ? `Meeting Purpose: ${meetingPurpose}` : 'Meeting Purpose: (not specified)'}

Available Time Slots:
${timeSlots}

Generate a complete email with:
1. A concise subject line (e.g., "Meeting Time Slots - [Purpose]" or "Re: [Previous Subject]" if in a thread)
2. A professional email body that offers these time slots`;

    if (threadContext && threadContext.messages && threadContext.messages.length > 0) {
      const threadHistory = threadContext.messages
        .map((msg: any, idx: number) => {
          const from = msg.from || 'Unknown';
          const timestamp = msg.timestamp || msg.createdAt || 'Unknown time';
          const msgText = msg.text || msg.body || '';
          return `[${idx + 1}] From: ${from} | Time: ${timestamp}\n${msgText}`;
        })
        .join('\n\n---\n\n');

      userMessage = `Thread History (${threadContext.messages.length} messages):\n\n${threadHistory}\n\n---\n\n${userMessage}`;
    }

    try {
      const response = await this.chatGPTService.sendMessageWithFormat(
        userMessage,
        EmailResponseSchema,
        'email_response',
        [systemMessage],
        0.7,
        1000,
      );
      return {
        subject: response.subject,
        emailContent: response.emailContent,
      };
    } catch (error) {
      this.logger.error(`Error generating offer email with AI: ${error.message}`);
      return this.generateSimpleOfferEmail(context, recipientName, senderName, meetingPurpose);
    }
  }

  private generateSimpleOfferEmail(
    context: OfferEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
  ): { subject: string; emailContent: string } {
    const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
    const purposeLine = meetingPurpose ? `regarding ${meetingPurpose}` : 'to discuss further';

    const timeSlots = context.availableTimeSlots
      .map((slot, index) => {
        const formattedDate = this.formatDateForEmail(slot.date);
        const timeRange = `${slot.startTime} - ${slot.endTime}`;
        return `${index + 1}. ${formattedDate} at ${timeRange}`;
      })
      .join('\n');

    const signature = senderName ? `\n\nBest regards,\n${senderName}` : '';

    const subject = meetingPurpose
      ? `Meeting Time Slots - ${meetingPurpose}`
      : 'Meeting Time Slots Available';

    const emailContent = `${greeting}

Thank you for your interest in scheduling a meeting ${purposeLine}.

I would like to propose the following time slots for our meeting:

${timeSlots}

Please let me know which time works best for you, or feel free to suggest an alternative if none of these options are suitable.

I look forward to hearing from you.${signature}`;

    return { subject, emailContent };
  }

  private async generateConfirmEmail(
    context: ConfirmEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
    threadContext: any = null,
  ): Promise<{ subject: string; emailContent: string }> {
    const formattedDate = this.formatDateForEmail(context.confirmedTimeSlot.date);
    const timeRange = `${context.confirmedTimeSlot.startTime} - ${context.confirmedTimeSlot.endTime}`;

    const systemMessage = {
      role: 'system' as const,
      content: `You are a professional email assistant. Generate a polite and professional email to confirm a meeting time.

Rules:
- Use appropriate greeting based on recipient name (formal if name provided, casual if not)
- Be professional and courteous
- Clearly confirm the scheduled meeting date and time
- Express enthusiasm about the upcoming meeting
- Offer flexibility for any changes if needed
- Include appropriate closing and signature if sender name is provided
- Keep the tone warm but professional
- DO NOT use any special formatting like bold (**text**) or markdown
- If thread history is provided, reference the conversation context naturally
- Create a concise and professional subject line for the confirmation`,
    };

    let userMessage = `Generate an email with subject and body for the following information:

Action: Confirm meeting time
${recipientName ? `Recipient Name: ${recipientName}` : 'Recipient: (no specific name)'}
${senderName ? `Sender Name: ${senderName}` : 'Sender: (no specific name)'}
${meetingPurpose ? `Meeting Purpose: ${meetingPurpose}` : 'Meeting Purpose: (not specified)'}

Confirmed Meeting Time:
Date: ${formattedDate}
Time: ${timeRange}

Generate a complete email with:
1. A concise subject line (e.g., "Meeting Confirmed - [Purpose]" or "Re: [Previous Subject]" if in a thread)
2. A professional email body that confirms this meeting`;

    if (threadContext && threadContext.messages && threadContext.messages.length > 0) {
      const threadHistory = threadContext.messages
        .map((msg: any, idx: number) => {
          const from = msg.from || 'Unknown';
          const timestamp = msg.timestamp || msg.createdAt || 'Unknown time';
          const msgText = msg.text || msg.body || '';
          return `[${idx + 1}] From: ${from} | Time: ${timestamp}\n${msgText}`;
        })
        .join('\n\n---\n\n');

      userMessage = `Thread History (${threadContext.messages.length} messages):\n\n${threadHistory}\n\n---\n\n${userMessage}`;
    }

    try {
      const response = await this.chatGPTService.sendMessageWithFormat(
        userMessage,
        EmailResponseSchema,
        'email_response',
        [systemMessage],
        0.7,
        1000,
      );
      return {
        subject: response.subject,
        emailContent: response.emailContent,
      };
    } catch (error) {
      this.logger.error(`Error generating confirm email with AI: ${error.message}`);
      return this.generateSimpleConfirmEmail(context, recipientName, senderName, meetingPurpose);
    }
  }

  private generateSimpleConfirmEmail(
    context: ConfirmEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
  ): { subject: string; emailContent: string } {
    const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
    const purposeLine = meetingPurpose ? ` ${meetingPurpose}` : '';

    const formattedDate = this.formatDateForEmail(context.confirmedTimeSlot.date);
    const timeRange = `${context.confirmedTimeSlot.startTime} - ${context.confirmedTimeSlot.endTime}`;

    const signature = senderName ? `\n\nBest regards,\n${senderName}` : '';

    const subject = meetingPurpose ? `Meeting Confirmed - ${meetingPurpose}` : 'Meeting Confirmed';

    const emailContent = `${greeting}

Thank you for confirming the meeting${purposeLine}.

I am pleased to confirm our meeting scheduled for:

Date: ${formattedDate}
Time: ${timeRange}

I look forward to meeting with you. If you need to make any changes, please don't hesitate to let me know.${signature}`;

    return { subject, emailContent };
  }

  private async generateCounterOfferEmail(
    context: CounterOfferEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
    threadContext: any = null,
  ): Promise<{ subject: string; emailContent: string }> {
    const proposedDate = this.formatDateForEmail(context.proposedTimeSlot.date);
    const proposedTime = `${context.proposedTimeSlot.startTime} - ${context.proposedTimeSlot.endTime}`;

    const alternativeSlots = context.alternativeTimeSlots
      .map((slot, index) => {
        const formattedDate = this.formatDateForEmail(slot.date);
        const timeRange = `${slot.startTime} - ${slot.endTime}`;
        return `${index + 1}. ${formattedDate} at ${timeRange}`;
      })
      .join('\n');

    const systemMessage = {
      role: 'system' as const,
      content: `You are a professional email assistant. Generate a polite and professional email to propose alternative meeting times.

Rules:
- Use appropriate greeting based on recipient name (formal if name provided, casual if not)
- Be professional and courteous
- Politely indicate that the proposed time doesn't work
- Clearly present alternative time slots
- Show willingness to be flexible and find a suitable time
- Ask the recipient to choose or suggest other alternatives
- Include appropriate closing and signature if sender name is provided
- Keep the tone warm, apologetic but professional
- DO NOT use any special formatting like bold (**text**) or markdown
- If thread history is provided, reference the conversation context naturally
- Create a concise and professional subject line for the counter-offer`,
    };

    let userMessage = `Generate an email with subject and body for the following information:

Action: Counter-offer with alternative meeting times
${recipientName ? `Recipient Name: ${recipientName}` : 'Recipient: (no specific name)'}
${senderName ? `Sender Name: ${senderName}` : 'Sender: (no specific name)'}
${meetingPurpose ? `Meeting Purpose: ${meetingPurpose}` : 'Meeting Purpose: (not specified)'}

Originally Proposed Time (that doesn't work):
Date: ${proposedDate}
Time: ${proposedTime}

Alternative Time Slots:
${alternativeSlots}

Generate a complete email with:
1. A concise subject line (e.g., "Alternative Meeting Times - [Purpose]" or "Re: [Previous Subject]" if in a thread)
2. A professional email body that politely declines the original time and proposes these alternatives`;

    if (threadContext && threadContext.messages && threadContext.messages.length > 0) {
      const threadHistory = threadContext.messages
        .map((msg: any, idx: number) => {
          const from = msg.from || 'Unknown';
          const timestamp = msg.timestamp || msg.createdAt || 'Unknown time';
          const msgText = msg.text || msg.body || '';
          return `[${idx + 1}] From: ${from} | Time: ${timestamp}\n${msgText}`;
        })
        .join('\n\n---\n\n');

      userMessage = `Thread History (${threadContext.messages.length} messages):\n\n${threadHistory}\n\n---\n\n${userMessage}`;
    }

    try {
      const response = await this.chatGPTService.sendMessageWithFormat(
        userMessage,
        EmailResponseSchema,
        'email_response',
        [systemMessage],
        0.7,
        1000,
      );
      return {
        subject: response.subject,
        emailContent: response.emailContent,
      };
    } catch (error) {
      this.logger.error(`Error generating counter-offer email with AI: ${error.message}`);
      return this.generateSimpleCounterOfferEmail(
        context,
        recipientName,
        senderName,
        meetingPurpose,
      );
    }
  }

  private generateSimpleCounterOfferEmail(
    context: CounterOfferEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
  ): { subject: string; emailContent: string } {
    const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
    const purposeLine = meetingPurpose ? ` regarding ${meetingPurpose}` : '';

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

    const subject = meetingPurpose
      ? `Alternative Meeting Times - ${meetingPurpose}`
      : 'Alternative Meeting Times';

    const emailContent = `${greeting}

Thank you for your message${purposeLine}.

Unfortunately, I am not available on ${proposedDate} at ${proposedTime}. However, I would be happy to meet at one of the following alternative times:

${alternativeSlots}

Please let me know if any of these times work for you, or feel free to suggest another time that fits your schedule.

I look forward to finding a suitable time for our meeting.${signature}`;

    return { subject, emailContent };
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

  private async generateCheckTimeEmail(
    context: CheckTimeEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
    threadContext: any = null,
  ): Promise<{ subject: string; emailContent: string }> {
    const systemMessage = {
      role: 'system' as const,
      content: `You are a professional email assistant. Generate a polite and professional email to check if a meeting time is available.

Rules:
- Use appropriate greeting based on recipient name (formal if name provided, casual if not)
- Be professional and courteous
- Clearly check if the meeting time is available
- Include appropriate closing and signature if sender name is provided
- Keep the tone warm but professional
- DO NOT use any special formatting like bold (**text**) or markdown
- If thread history is provided, reference the conversation context naturally
- Create a concise and professional subject line for the check time`,
    };

    let userMessage = `Generate an email with subject and body for the following information:

Action: Check meeting time
${recipientName ? `Recipient Name: ${recipientName}` : 'Recipient: (no specific name)'}
${senderName ? `Sender Name: ${senderName}` : 'Sender: (no specific name)'}
${meetingPurpose ? `Meeting Purpose: ${meetingPurpose}` : 'Meeting Purpose: (not specified)'}

Time to Check:
Date: ${context.timeSuggestions[0].date}
Time: ${context.timeSuggestions[0].startTime} - ${context.timeSuggestions[0].endTime}

Generate a complete email with:
1. A concise subject line (e.g., "Check Meeting Time - [Purpose]" or "Re: [Previous Subject]" if in a thread)
2. A professional email body that checks if the meeting time is available`;

    if (threadContext && threadContext.messages && threadContext.messages.length > 0) {
      const threadHistory = threadContext.messages
        .map((msg: any, idx: number) => {
          const from = msg.from || 'Unknown';
          const timestamp = msg.timestamp || msg.createdAt || 'Unknown time';
          const msgText = msg.text || msg.body || '';
          return `[${idx + 1}] From: ${from} | Time: ${timestamp}\n${msgText}`;
        })
        .join('\n\n---\n\n');

      userMessage = `Thread History (${threadContext.messages.length} messages):\n\n${threadHistory}\n\n---\n\n${userMessage}`;
    }

    try {
      const response = await this.chatGPTService.sendMessageWithFormat(
        userMessage,
        EmailResponseSchema,
        'email_response',
        [systemMessage],
        0.7,
        1000,
      );
      return {
        subject: response.subject,
        emailContent: response.emailContent,
      };
    } catch (error) {
      this.logger.error(`Error generating check time email with AI: ${error.message}`);
      return this.generateSimpleCheckTimeEmail(context, recipientName, senderName, meetingPurpose);
    }
  }

  private generateSimpleCheckTimeEmail(
    context: CheckTimeEmailContext,
    recipientName?: string,
    senderName?: string,
    meetingPurpose?: string,
  ): { subject: string; emailContent: string } {
    const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
    const purposeLine = meetingPurpose ? ` regarding ${meetingPurpose}` : '';

    const formattedDate = this.formatDateForEmail(context.timeSuggestions[0].date);
    const timeRange = `${context.timeSuggestions[0].startTime} - ${context.timeSuggestions[0].endTime}`;

    const signature = senderName ? `\n\nBest regards,\n${senderName}` : '';

    const subject = meetingPurpose
      ? `Check Meeting Time - ${meetingPurpose}`
      : 'Check Meeting Time';

    const emailContent = `${greeting}

Thank you for your message${purposeLine}.

I am checking if the meeting time is available on ${formattedDate} at ${timeRange}.

I look forward to hearing from you.${signature}`;

    return { subject, emailContent };
  }
}
