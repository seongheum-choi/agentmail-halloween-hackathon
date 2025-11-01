import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { ChatGPTService } from './services/chatgpt.service';
import { HyperspellService } from './services/hyperspell.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService, ChatGPTService, HyperspellService],
  exports: [AgentService, ChatGPTService, HyperspellService],
})
export class AgentModule {}
