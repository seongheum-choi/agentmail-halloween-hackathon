import { Injectable, Logger } from '@nestjs/common';
<<<<<<< Updated upstream
import { ChatGPTService } from './services/chatgpt.service';
=======
import { AnthropicService } from './services/anthropic.service';
import { HyperspellService } from './services/hyperspell.service';
>>>>>>> Stashed changes
import { ChatRequestDto } from './dto/chat-request.dto';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

<<<<<<< Updated upstream
  constructor(private readonly chatgptService: ChatGPTService) {}
=======
  constructor(
    private readonly anthropicService: AnthropicService,
    private readonly hyperspellService: HyperspellService,
  ) {}
>>>>>>> Stashed changes

  async chat(chatRequest: ChatRequestDto) {
    this.logger.log(
      `Processing chat request: ${chatRequest.message.substring(0, 50)}...`,
    );

    try {
<<<<<<< Updated upstream
      const response = await this.chatgptService.sendMessage(
        chatRequest.message,
=======
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

      const response = await this.anthropicService.sendMessage(
        enhancedMessage,
>>>>>>> Stashed changes
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
