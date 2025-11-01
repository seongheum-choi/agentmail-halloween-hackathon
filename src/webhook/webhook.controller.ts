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
    this.logger.log('AgentMail Webhook received');

    this.webhookService.handleWebhook(payload).catch((error) => {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
    });

    // TODO: Should labeling given email with purpose.
    return { success: true };
  }

  @Post('test')
  @HttpCode(200)
  async handleTestWebhook(@Body() payload: WebhookPayloadDto) {
    this.logger.log('[TEST] AgentMail Webhook received');

    this.webhookService.handleTestWebhook(payload).catch((error) => {
      this.logger.error(`Error processing [TEST] AgentMail webhook: ${error.message}`, error.stack);
    });

    return { success: true };
  }

  @Post('agentmail')
  @HttpCode(200)
  async handleAgentMailWebhook(@Body() payload: WebhookPayloadDto) {
    this.logger.log('[TEST] AgentMail Webhook received');

    this.webhookService.handleWebhookWithAI(payload).catch((error) => {
      this.logger.error(`Error processing [TEST] AgentMail webhook: ${error.message}`, error.stack);
    });

    return { success: true };
  }
}
