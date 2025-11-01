import { Injectable, Logger } from '@nestjs/common';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { EmailClassifierService } from './services/email-classifier.service';
import { ActionSelectorService } from './services/action-selector.service';
import { EmailContext } from './types/action.types';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly emailClassifierService: EmailClassifierService,
    private readonly actionSelectorService: ActionSelectorService,
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
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      receivedAt: message.timestamp,
      labels: classification.labels,
      isSpam: classification.isSpam,
      isReservation: classification.isReservation,
    };

    this.logger.log(
      `Email classified - Labels: ${classification.labels.join(', ')}`,
    );

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

    console.log(JSON.stringify({
      action: actionResult.action,
      confidence: actionResult.confidence,
      reasoning: actionResult.reasoning,
    }, null, 2));

    this.logger.log('============================');
  }
}
