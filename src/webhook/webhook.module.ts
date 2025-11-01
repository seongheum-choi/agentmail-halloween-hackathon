import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { EmailClassifierService } from './services/email-classifier.service';
import { ActionSelectorService } from './services/action-selector.service';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [AgentModule],
  controllers: [WebhookController],
  providers: [WebhookService, EmailClassifierService, ActionSelectorService],
})
export class WebhookModule {}
