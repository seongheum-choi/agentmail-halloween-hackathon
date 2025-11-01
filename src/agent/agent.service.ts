import { Injectable, Logger } from '@nestjs/common';
import { ChatGPTService } from './services/chatgpt.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private readonly chatgptService: ChatGPTService) {}

  async chat(chatRequest: ChatRequestDto) {
    this.logger.log(`Processing chat request: ${chatRequest.message.substring(0, 50)}...`);

    try {
      const response = await this.chatgptService.sendMessage(
        chatRequest.message,
        chatRequest.conversationHistory,
      );

      return {
        success: true,
        response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error processing chat: ${error.message}`);
      throw error;
    }
  }
}
