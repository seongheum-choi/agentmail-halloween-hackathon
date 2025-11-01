import { Injectable, Logger } from '@nestjs/common';
import { ChatGPTService } from './services/chatgpt.service';
import { HyperspellService } from './services/hyperspell.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly chatgptService: ChatGPTService,
    private readonly hyperspellService: HyperspellService,
  ) {}

  async chat(chatRequest: ChatRequestDto) {
    this.logger.log(
      `Processing chat request: ${chatRequest.message.substring(0, 50)}...`,
    );

    try {
      let relevantContext = '';

      try {
        const memoryAnswer = await this.hyperspellService.search(
          chatRequest.message,
          'anonymous',
          true,
        );

        if (memoryAnswer) {
          relevantContext = `\n\nRelevant context from user's memories:\n${memoryAnswer}`;
          this.logger.log('Successfully retrieved context from Hyperspell');
        }
      } catch (memoryError) {
        this.logger.warn(
          `Hyperspell search failed: ${memoryError.message}. Continuing without memory context.`,
        );
      }

      const enhancedMessage = chatRequest.message + relevantContext;

      const response = await this.chatgptService.sendMessage(
        enhancedMessage,
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
