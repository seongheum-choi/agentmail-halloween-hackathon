import { Injectable, Logger } from '@nestjs/common';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { EmailClassifierService } from './services/email-classifier.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly emailClassifierService: EmailClassifierService,
  ) {}

  async handleWebhook(payload: WebhookPayloadDto): Promise<void> {
    this.logger.log(`Received webhook: ${payload.event_type}`);

    const { message } = payload;

    const classification = await this.emailClassifierService.classifyEmail(
      message.subject,
      message.text,
    );

    const enrichedMessage = {
      id: message.id,
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      receivedAt: message.received_at,
      labels: classification.labels,
      isSpam: classification.isSpam,
      isReservation: classification.isReservation,
    };

    this.logger.log(
      `Email classified - Labels: ${classification.labels.join(', ')}`,
    );

    if (!classification.isSpam && classification.isReservation) {
      this.handleReservation(enrichedMessage);
    }
  }

  private handleReservation(message: any): void {
    this.logger.log('=== RESERVATION DETECTED ===');
    console.log(JSON.stringify(message, null, 2));
    this.logger.log('============================');
  }
}
