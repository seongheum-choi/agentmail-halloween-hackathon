import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { ChatGPTService } from './services/chatgpt.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService, ChatGPTService],
  exports: [AgentService, ChatGPTService],
})
export class AgentModule {}
