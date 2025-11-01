import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AnthropicService } from './services/anthropic.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService, AnthropicService],
  exports: [AgentService],
})
export class AgentModule {}
