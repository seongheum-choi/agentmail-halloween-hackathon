import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AgentService } from './agent.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { HyperspellService } from './services/hyperspell.service';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly hyperspellService: HyperspellService,
  ) {}

  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto) {
    return this.agentService.chat(chatRequest);
  }

  @Get('hyperspell/connect-url')
  async getHyperspellConnectUrl(
    @Query('userId') userId?: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    const token = await this.hyperspellService.getUserToken(userId);
    const redirect = redirectUri || 'http://localhost:3000';
    const connectUrl = `https://connect.hyperspell.com?token=${token}&redirect_uri=${redirect}`;

    return {
      connectUrl,
      token,
    };
  }
}
