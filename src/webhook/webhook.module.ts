import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { EmailClassifierService } from './services/email-classifier.service';
import { ActionSelectorService } from './services/action-selector.service';
import { EmailResponseGeneratorService } from './services/email-response-generator.service';
import { SchedulerService } from './services/scheduler.service';
import { CalendarInviteService } from './services/calendar-invite.service';
import { AgentModule } from '../agent/agent.module';
import { AgentMailModule } from '../agentmail/agentmail.module';

@Module({
  imports: [AgentModule, AgentMailModule],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    EmailClassifierService,
    ActionSelectorService,
    EmailResponseGeneratorService,
    SchedulerService,
    CalendarInviteService,
  ],
  exports: [EmailResponseGeneratorService],
})
export class WebhookModule {}
