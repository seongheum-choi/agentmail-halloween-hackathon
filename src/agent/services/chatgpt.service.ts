import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class ChatGPTService {
  private readonly logger = new Logger(ChatGPTService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not found in environment variables');
    }

    this.client = new OpenAI({
      apiKey: apiKey || '',
    });

    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    this.logger.log(`Initialized ChatGPT service with model: ${this.model}`);
  }

  async sendMessage(message: string, conversationHistory?: Message[], temperature?: number, maxTokens?: number): Promise<string> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...(conversationHistory || []).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: message,
        },
      ];

      this.logger.debug(`Sending message to ChatGPT API with ${messages.length} messages`);

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: maxTokens || 4096,
        temperature: temperature ?? 0.7,
        messages,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return content;
      }

      throw new Error('Unexpected response type from ChatGPT API');
    } catch (error) {
      this.logger.error(`Error calling ChatGPT API: ${error.message}`);
      throw error;
    }
  }

  async sendMessageWithFormat<T extends z.ZodType>(
    message: string,
    zodSchema: T,
    schemaName: string,
    conversationHistory?: Message[],
    temperature?: number,
    maxTokens?: number,
  ): Promise<z.infer<T>> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...(conversationHistory || []).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: message,
        },
      ];

      this.logger.debug(`Sending structured message to ChatGPT API with ${messages.length} messages`);

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: maxTokens || 4096,
        temperature: temperature ?? 0.7,
        messages,
        response_format: zodResponseFormat(zodSchema, schemaName),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from ChatGPT API');
      }

      // Parse and validate the JSON response against the schema
      const parsed = JSON.parse(content);
      const validated = zodSchema.parse(parsed);
      return validated;
    } catch (error) {
      this.logger.error(`Error calling ChatGPT API with structured output: ${error.message}`);
      throw error;
    }
  }
}
