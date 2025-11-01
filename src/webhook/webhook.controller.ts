import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() payload: WebhookPayloadDto) {
    this.logger.log('Webhook received');

    this.webhookService.handleWebhook(payload).catch((error) => {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
    });

    // TODO: Should labeling given email with purpose.
    return { success: true };
  }
}
