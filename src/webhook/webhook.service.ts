import { Injectable, Logger } from '@nestjs/common';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { EmailClassifierService } from './services/email-classifier.service';
import { ActionSelectorService } from './services/action-selector.service';
import { SchedulerService } from './services/scheduler.service';
import { CalendarInviteService } from './services/calendar-invite.service';
import { EmailResponseGeneratorService } from './services/email-response-generator.service';
import { AgentMailService } from '../agentmail/services/agentmail.service';
import { EmailContext, EmailAction } from './types/action.types';

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
  ) {}

  async handleWebhook(payload: WebhookPayloadDto): Promise<void> {
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
      await this.handleReservation(enrichedMessage);
    }
  }

  private async handleReservation(message: any): Promise<void> {
    this.logger.log('=== RESERVATION DETECTED ===');
    console.log(JSON.stringify(message, null, 2));

    const actionResult = await this.actionSelectorService.selectAction(
      message.subject,
      message.text,
      EmailContext.INITIAL,
    );

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

      const icsContent = this.calendarInviteService.generateICS({
        summary: message.subject,
        description: `Meeting scheduled in response to: ${message.text.substring(0, 100)}...`,
        location: 'To be determined',
        startTime: startDateTime,
        endTime: endDateTime,
        organizer: {
          name: 'AgentMail AI',
          email: message.to,
        },
        attendees: [
          {
            name: message.from.split('@')[0],
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
        icsContent,
        cc: null, // TODO: Fill the cc recipients from the user's profile
      });

      this.logger.log(`Response email sent to: ${message.from}`);
    }

    this.logger.log('============================');
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
      await this.handleReservation(enrichedMessage);
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
      const emailText = await this.emailResponseGeneratorService.generateEmail({
        action: EmailAction.CONFIRM,
        context: {},
        recipientName: message.from.split('@')[0],
        senderName: 'AgentMail AI',
        meetingPurpose: message.subject,
      });
    }

    const availableSlots = await this.schedulerService.findAvailableSlots(
      {
        meetingDuration: 60,
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      },
      'sandbox:juungbae@gmail.com', // TODO: Get user ID from message or context as needed
    );
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
