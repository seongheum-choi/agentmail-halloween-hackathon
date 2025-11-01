import { Injectable, Logger } from '@nestjs/common';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { EmailClassifierService } from './services/email-classifier.service';
import { ActionSelectorService } from './services/action-selector.service';
import { SchedulerService } from './services/scheduler.service';
import { CalendarInviteService } from './services/calendar-invite.service';
import { EmailContext, EmailAction } from './types/action.types';
import { HyperspellService } from '../agent/services/hyperspell.service';
import { AgentMailService } from '../agentmail/services/agentmail.service';
import { EmailResponseGeneratorService } from './services/email-response-generator.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly emailClassifierService: EmailClassifierService,
    private readonly actionSelectorService: ActionSelectorService,
    private readonly hyperspellService: HyperspellService,
    private readonly emailResponseGeneratorService: EmailResponseGeneratorService,
    private readonly schedulerService: SchedulerService,
    private readonly calendarInviteService: CalendarInviteService,
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
        meetingDuration: 60,
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      },
      'anonymous',
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
        .map((slot, idx) => `${idx + 2}. ${slot.date} at ${slot.startTime} - ${slot.endTime}`)
        .join('\n')}`
    : ''
}

Please find the calendar invitation attached. Looking forward to meeting with you.

Best regards,
AgentMail AI`;

      await this.agentMailService.replyToMessage({
        inboxId: message.inboxId,
        messageId: message.id,
        text: emailText,
        icsContent,
      });

      this.logger.log(`Response email sent to: ${message.from}`);
    }

    this.logger.log('============================');

    if (actionResult.action === 'CONFIRM') {
      return;
    }

    if (actionResult.action === 'CHECK_TIME') {
      const query = `IS THERE ANY SCHEDULE at ${actionResult.time_schedule}?`;
      this.logger.log(`Querying calendar: ${query}`);

      const calendarResult = await this.hyperspellService.queryCalendar(query);

      this.logger.log('Calendar Query Result:');
      this.logger.log(`Answer: ${calendarResult.answer}`);

      if (calendarResult.documents.length > 0) {
        this.logger.log(`Found ${calendarResult.documents.length} relevant calendar events`);
      }

      // Create response based on calendarResult.answer
      const nextActionResult = await this.actionSelectorService.selectAction(
        message.subject,
        message.text + '\n\nCalendar Availability: ' + calendarResult.answer,
        EmailContext.AFTER_CHECK_TIME,
      );

      this.logger.log(`Next Selected Action: ${nextActionResult.action}`);
      this.logger.log(`Confidence: ${nextActionResult.confidence}`);
      this.logger.log(`Reasoning: ${nextActionResult.reasoning}`);

      console.log(
        JSON.stringify(
          {
            action: nextActionResult.action,
            confidence: nextActionResult.confidence,
            reasoning: nextActionResult.reasoning,
          },
          null,
          2,
        ),
      );

      if (nextActionResult.action === 'CONFIRM') {
        this.logger.log('Reservation can be confirmed based on calendar availability.');
        await this.sendConfirmationEmail(message, actionResult.time_schedule);
      }
    }
  }

  private async sendConfirmationEmail(message: any, timeSchedule: string): Promise<void> {
    try {
      this.logger.log('Generating confirmation email response');

      // Generate email response
      const emailResponse = this.emailResponseGeneratorService.generateEmail({
        action: EmailAction.CONFIRM,
        context: {
          confirmedTimeSlot: {
            date: timeSchedule.split(' ')[0],
            startTime: timeSchedule.split(' ')[1],
            endTime: timeSchedule.split(' ')[1],
          },
        },
        recipientName: message.from.split('@')[0],
        senderName: 'AgentMail Assistant',
        meetingPurpose: message.subject,
      });

      this.logger.log('Sending confirmation email via AgentMail');

      // Send email via AgentMail
      const inboxes = await this.agentMailService.listInboxes();
      if (inboxes.length === 0) {
        this.logger.error('No inboxes available to send from');
        return;
      }

      // FIXME: bug caused.
      const inboxId = inboxes[0].id;
      this.logger.log(`Sending from inbox: ${inboxId}`);

      await this.agentMailService.sendResponse('halloween-test@agentmail.to', {
        to: message.from,
        subject: `Re: ${message.subject}`,
        text: emailResponse,
        labels: ['reservation', 'confirmed'],
      });

      this.logger.log('Confirmation email sent successfully');
    } catch (error) {
      this.logger.error('Failed to send confirmation email', error);
      throw error;
    }
  }
}
