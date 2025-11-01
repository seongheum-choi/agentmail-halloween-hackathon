import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { EmailClassifierService } from './services/email-classifier.service';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, EmailClassifierService],
})
export class WebhookModule {}
