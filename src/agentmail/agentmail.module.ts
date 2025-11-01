import { Module } from '@nestjs/common';
import { AgentMailService } from './services/agentmail.service';

@Module({
  controllers: [],
  providers: [AgentMailService],
  exports: [AgentMailService],
})
export class AgentMailModule {}
