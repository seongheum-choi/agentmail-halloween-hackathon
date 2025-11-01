import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not found in environment variables');
    }

    this.client = new Anthropic({
      apiKey: apiKey || '',
    });

    this.model = this.configService.get<string>('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20241022';
    this.logger.log(`Initialized Anthropic service with model: ${this.model}`);
  }

  async sendMessage(message: string, conversationHistory?: Message[]): Promise<string> {
    try {
      const messages: Anthropic.MessageParam[] = [
        ...(conversationHistory || []).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: message,
        },
      ];

      this.logger.debug(`Sending message to Anthropic API with ${messages.length} messages`);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages,
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response type from Anthropic API');
    } catch (error) {
      this.logger.error(`Error calling Anthropic API: ${error.message}`);
      throw error;
    }
  }
}
