import { Controller, Post, Body } from '@nestjs/common';
import { AgentService } from './agent.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto) {
    return this.agentService.chat(chatRequest);
  }
}
