import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
<<<<<<< Updated upstream
import { ChatGPTService } from './services/chatgpt.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService, ChatGPTService],
  exports: [AgentService, ChatGPTService],
=======
import { AnthropicService } from './services/anthropic.service';
import { HyperspellService } from './services/hyperspell.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService, AnthropicService, HyperspellService],
  exports: [AgentService, HyperspellService],
>>>>>>> Stashed changes
})
export class AgentModule {}
