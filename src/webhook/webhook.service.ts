import { Injectable, Logger } from '@nestjs/common';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { EmailClassifierService } from './services/email-classifier.service';
import { ActionSelectorService } from './services/action-selector.service';
import { SchedulerService } from './services/scheduler.service';
import { CalendarInviteService } from './services/calendar-invite.service';
import { EmailResponseGeneratorService } from './services/email-response-generator.service';
import { AgentMailService } from '../agentmail/services/agentmail.service';
import { InboxesRepository, UsersRepository } from '@/repository';
import {
  EmailContext,
  EmailAction,
  EmailGenerationContext,
  OfferEmailContext,
  ConfirmEmailContext,
  CounterOfferEmailContext,
  CheckTimeEmailContext,
} from './types/action.types';
import { EnrichedMessage } from './types/message.types';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly emailClassifierService: EmailClassifierService,
    private readonly actionSelectorService: ActionSelectorService,
    private readonly schedulerService: SchedulerService,
    private readonly calendarInviteService: CalendarInviteService,
    private readonly emailResponseGeneratorService: EmailResponseGeneratorService,
    private readonly agentMailService: AgentMailService,
    private readonly userRepository: UsersRepository,
    private readonly inboxRepository: InboxesRepository,
  ) {}

  private formatMeetingTitle(purpose: string, date: string, time: string): string {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    return `${purpose} at ${time} ${dayOfWeek}`;
  }

  async handleWebhook(payload: WebhookPayloadDto): Promise<void> {
    this.logger.log(`Received webhook: ${payload.event_type}`);

    const { message } = payload;

    let threadContext = null;
    try {
      this.logger.log(`Fetching thread context for thread_id: ${message.thread_id}`);
      threadContext = await this.agentMailService.getThread(message.thread_id);
      this.logger.log(
        `Thread context fetched successfully with ${threadContext.messages?.length || 0} messages`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to fetch thread context: ${error.message}. Continuing without context.`,
      );
    }

    const classification = await this.emailClassifierService.classifyEmail(
      message.subject,
      message.text,
      threadContext,
    );

    const enrichedMessage = {
      id: message.message_id,
      inboxId: message.inbox_id,
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      receivedAt: message.timestamp,
      labels: classification.labels,
      isSpam: classification.isSpam,
      isReservation: classification.isReservation,
    };

    this.logger.log(`Email classified - Labels: ${classification.labels.join(', ')}`);

    if (!classification.isSpam && classification.isReservation) {
      await this.handleReservation(enrichedMessage, threadContext);
    }
  }

  async handleTestWebhook(message: any): Promise<void> {
    // Immediately call confirm schedule
    await this.confirmSchedule(message);
  }

  // Use this for testing webhook
  private async handleReservation(
    message: EnrichedMessage,
    threadContext: any = null,
  ): Promise<void> {
    this.logger.log('=== RESERVATION DETECTED ===');
    this.logger.log(`Enriched Message: ${JSON.stringify(message, null, 2)}`);

    const actionResult = await this.actionSelectorService.selectAction(
      message.subject,
      message.text,
      EmailContext.INITIAL,
      threadContext,
    );

    this.logger.log(`Selected Action: ${actionResult.action}`);
    this.logger.log(`Confidence: ${actionResult.confidence}`);
    this.logger.log(`Reasoning: ${actionResult.reasoning}`);

    const timeSuggestions = actionResult.timeSuggestions || [];
    const context: EmailGenerationContext = (() => {
      switch (actionResult.action) {
        case EmailAction.OFFER:
          return {
            availableTimeSlots: timeSuggestions,
          } as OfferEmailContext;
        case EmailAction.CONFIRM:
          return {
            confirmedTimeSlot: timeSuggestions[0],
          } as ConfirmEmailContext;
        case EmailAction.COUNTEROFFER:
          return {
            proposedTimeSlot: timeSuggestions[0],
            alternativeTimeSlots: timeSuggestions.slice(1),
          } as CounterOfferEmailContext;
        case EmailAction.CHECK_TIME:
          return {
            timeSuggestions: timeSuggestions,
          } as CheckTimeEmailContext;
        default:
          throw new Error(`Unsupported action: ${actionResult.action}`);
      }
    })();

    const { emailContent, subject } = await this.emailResponseGeneratorService.generateEmail(
      {
        action: actionResult.action,
        context,
        recipientName: message.from.split('@')[0],
        senderName: 'AgentMail AI',
        meetingPurpose: message.subject,
      },
      threadContext,
    );

    let icsContent: string | undefined;
    let meetingTitle: string | undefined;

    if (timeSuggestions.length > 0) {
      const primarySlot = timeSuggestions[0];
      meetingTitle = this.formatMeetingTitle(subject, primarySlot.date, primarySlot.startTime);

      if (actionResult.action === EmailAction.CONFIRM) {
        const startDateTime = new Date(`${primarySlot.date}T${primarySlot.startTime}:00`);
        const endDateTime = new Date(`${primarySlot.date}T${primarySlot.endTime}:00`);

        icsContent = this.calendarInviteService.generateICS({
          summary: meetingTitle,
          description: `Meeting confirmed: ${subject}`,
          location: 'To be determined',
          startTime: startDateTime,
          endTime: endDateTime,
          organizer: {
            name: 'AgentMail AI',
            email: message.to[0],
          },
          attendees: [
            {
              name: message.from.split('@')[0],
              email: message.from,
            },
          ],
        });

        this.logger.log('Generated ICS for CONFIRM action');
      }
    }

    await this.agentMailService.replyToMessage({
      inboxId: message.inboxId,
      messageId: message.id,
      text: emailContent,
      subject: meetingTitle,
      icsContent,
      cc: null, // TODO: Fill the cc recipients from the user's profile
    });
  }

  // Handle webhook with AI classification and action selection
  async handleWebhookWithAI(payload: WebhookPayloadDto): Promise<void> {
    this.logger.log(`Received webhook: ${payload.event_type}`);

    const { message } = payload;

    const classification = await this.emailClassifierService.classifyEmail(
      message.subject,
      message.text,
    );

    const enrichedMessage = {
      id: message.message_id,
      inboxId: message.inbox_id,
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      receivedAt: message.timestamp,
      labels: classification.labels,
      isSpam: classification.isSpam,
      isReservation: classification.isReservation,
    };

    this.logger.log(`Email classified - Labels: ${classification.labels.join(', ')}`);

    if (!classification.isSpam && classification.isReservation) {
      await this.handleReservationWithAI(enrichedMessage);
    }
  }

  // Handle reservation email with AI
  private async handleReservationWithAI(message: any): Promise<void> {
    this.logger.log('=== RESERVATION DETECTED ===');
    console.log(JSON.stringify(message, null, 2));

    const actionResult = await this.actionSelectorService.selectAction(
      message.subject,
      message.text,
      EmailContext.INITIAL,
    );

    const inboxUser = await this.inboxRepository.getByInboxId({ inboxId: message.inboxId });
    const targetUser = await this.userRepository.getById({ id: inboxUser.user });

    this.logger.log(`Selected Action: ${actionResult.action}`);
    this.logger.log(`Confidence: ${actionResult.confidence}`);
    this.logger.log(`Reasoning: ${actionResult.reasoning}`);

    console.log(
      JSON.stringify(
        {
          action: actionResult.action,
          confidence: actionResult.confidence,
          reasoning: actionResult.reasoning,
        },
        null,
        2,
      ),
    );

    if (actionResult.action === EmailAction.CONFIRM) {
      const emailResponse = await this.emailResponseGeneratorService.generateEmail({
        action: EmailAction.CONFIRM,
        context: {
          confirmedTimeSlot: actionResult.timeSuggestions ? actionResult.timeSuggestions[0] : null,
        },
        recipientName: message.from.split('@')[0],
        senderName: 'AgentMail AI',
        meetingPurpose: message.subject,
      });

      await this.agentMailService.replyToMessage({
        inboxId: message.inboxId,
        messageId: message.id,
        text: emailResponse.emailContent,
        subject: emailResponse.subject,
        cc: null, // TODO: Get cc from user profile if needed
      });

      this.logger.log(`Confirmation email sent to: ${message.from}`);
      return;
    }

    // Handle CHECK_TIME action
    if (actionResult.action === EmailAction.CHECK_TIME) {
      const checkTimeAvailableAt = this.schedulerService.isTimeSlotAvailable(
        actionResult.timeSuggestions ? actionResult.timeSuggestions[0] : null,
        `sandbox:${targetUser.email}`, // TODO: Get user ID from message or context as needed
      );

      const timeAvailablityActionResult = await this.actionSelectorService.selectAction(
        message.subject,
        message.text +
          `And the given time slot is ${checkTimeAvailableAt ? 'available' : 'not available'}.`,
        EmailContext.AFTER_CHECK_TIME,
      );

      if (timeAvailablityActionResult.action === EmailAction.CONFIRM) {
        const emailResponse = await this.emailResponseGeneratorService.generateEmail({
          action: EmailAction.CONFIRM,
          context: {
            confirmedTimeSlot: actionResult.timeSuggestions
              ? actionResult.timeSuggestions[0]
              : null,
          },
          recipientName: message.from.split('@')[0],
          senderName: 'AgentMail AI',
          meetingPurpose: message.subject,
        });

        await this.agentMailService.replyToMessage({
          inboxId: message.inboxId,
          messageId: message.id,
          text: emailResponse.emailContent,
          subject: emailResponse.subject,
          cc: [targetUser.email],
        });

        this.logger.log(`Confirmation email sent to: ${message.from}`);
        return;
      } else if (timeAvailablityActionResult.action === EmailAction.COUNTEROFFER) {
        const availableSlots = await this.schedulerService.findAvailableSlots(
          {
            meetingDuration: 30, // TODO: Fill the meeting duration from the message object
            workingHours: targetUser.preferences.workingHours || {
              start: '09:00',
              end: '18:00',
            },
          },
          `sandbox:${targetUser.email}`, // TODO: Get user ID from message or context as needed
        );

        const emailResponse = await this.emailResponseGeneratorService.generateEmail({
          action: EmailAction.COUNTEROFFER,
          context: {
            proposedTimeSlot: actionResult.timeSuggestions ? actionResult.timeSuggestions[0] : null,
            alternativeTimeSlots: availableSlots,
          },
          recipientName: message.from.split('@')[0],
          senderName: 'AgentMail AI',
          meetingPurpose: message.subject,
        });

        await this.agentMailService.replyToMessage({
          inboxId: message.inboxId,
          messageId: message.id,
          text: emailResponse.emailContent,
          subject: emailResponse.subject,
          cc: [targetUser.email],
        });
      }
    } else if (actionResult.action === EmailAction.OFFER) {
      const availableSlots = await this.schedulerService.findAvailableSlots(
        {
          meetingDuration: 30, // TODO: Fill the meeting duration from the message object
          workingHours: targetUser.preferences.workingHours || {
            start: '09:00',
            end: '18:00',
          },
        },
        `sandbox:${targetUser.email}`, // TODO: Get user ID from message or context as needed
      );

      const emailResponse = await this.emailResponseGeneratorService.generateEmail({
        action: EmailAction.OFFER,
        context: {
          availableTimeSlots: availableSlots,
        },
        recipientName: message.from.split('@')[0],
        senderName: 'AgentMail AI',
        meetingPurpose: message.subject,
      });

      await this.agentMailService.replyToMessage({
        inboxId: message.inboxId,
        messageId: message.id,
        text: emailResponse.emailContent,
        subject: emailResponse.subject,
        cc: [targetUser.email],
      });
    }

    this.logger.log('============================');
  }

  private async confirmSchedule(message: any) {
    const availableSlots = await this.schedulerService.findAvailableSlots(
      {
        meetingDuration: 30, // TODO: Fill the meeting duration from the message object
        workingHours: {
          // TODO: Fill the working hours from the user's profile
          start: '09:00',
          end: '18:00',
        },
      },
      'anonymous', // TODO: Fill the user id from the message object
    );

    this.logger.log(`Found ${availableSlots.length} available slots`);

    if (availableSlots.length > 0) {
      const firstSlot = availableSlots[0];
      const startDateTime = new Date(`${firstSlot.date}T${firstSlot.startTime}:00`);
      const endDateTime = new Date(`${firstSlot.date}T${firstSlot.endTime}:00`);

      const meetingTitle = this.formatMeetingTitle(
        message.subject,
        firstSlot.date,
        firstSlot.startTime,
      );

      const icsContent = this.calendarInviteService.generateICS({
        summary: meetingTitle,
        description: `Meeting scheduled in response to: ${message.text?.substring(0, 100)}...`,
        location: 'To be determined',
        startTime: startDateTime,
        endTime: endDateTime,
        organizer: {
          name: 'AgentMail AI',
          email: message.to,
        },
        attendees: [
          {
            name: message.from?.split('@')[0],
            email: message.from,
          },
        ],
      });

      const emailText = `Thank you for your message.

I would like to schedule a meeting with you. Based on my availability, I propose the following time:

Date: ${firstSlot.date}
Time: ${firstSlot.startTime} - ${firstSlot.endTime}

${
  availableSlots.length > 1
    ? `Alternative time slots:\n${availableSlots
        .slice(1)
        .map((slot, idx) => `${idx + 3}. ${slot.date} at ${slot.startTime} - ${slot.endTime}`)
        .join('\n')}`
    : ''
}

Please find the calendar invitation attached. Looking forward to meeting with you.

Best regards,
AgentMail AI`;

      this.logger.log(`Whole Message object: ${JSON.stringify(message, null, 2)}`);
      await this.agentMailService.replyToMessage({
        inboxId: message.inboxId,
        messageId: message.id,
        text: emailText,
        subject: meetingTitle,
        icsContent,
        cc: null, // TODO: Fill the cc recipients from the user's profile
      });

      this.logger.log(`Response email sent to: ${message.from}`);
    }

    this.logger.log('============================');
  }
}

/**
 * 
 *       const emailText = await this.emailResponseGeneratorService.generateEmail({
        action: EmailAction.OFFER,
        context: {
          availableTimeSlots: availableSlots,
        },
        recipientName: message.from.split('@')[0],
        senderName: 'AgentMail AI',
        meetingPurpose: message.subject,
      });
 */
