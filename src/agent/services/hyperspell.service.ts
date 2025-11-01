import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Hyperspell from 'hyperspell';

@Injectable()
export class HyperspellService {
  private readonly logger = new Logger(HyperspellService.name);
  private hyperspell: Hyperspell;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('HYPERSPELL_API_KEY');

    if (!apiKey || apiKey === 'hs-0-xxxxxxxxxxxxxxxxxxxxxx') {
      throw new Error(
        'HYPERSPELL_API_KEY is not configured. Please set a valid API key in your .env file.',
      );
    }

    this.hyperspell = new Hyperspell({ apiKey });
  }

  async getUserToken(userId: string = 'anonymous'): Promise<string> {
    try {
      const response = await this.hyperspell.auth.userToken({ user_id: userId });

      this.logger.debug(`Obtained Hyperspell user token for userId=${userId} is ${response.token}`);
      return response.token;
    } catch (error) {
      throw new BadRequestException(
        `Failed to get Hyperspell user token: ${error.message}. Please verify your HYPERSPELL_API_KEY is valid.`,
      );
    }
  }

  async search(query: string, userId: string = 'anonymous', answer: boolean = true) {
    try {
      const userToken = await this.getUserToken('sandbox:juungbae@gmail.com');
      const client = new Hyperspell({
        apiKey: userToken,
      });

      const response = await client.memories.search({
        query,
        answer,
        sources: [
          'google_mail',
          'slack',
          'google_drive',
          'notion',
          'github',
          'google_calendar',
          'google_docs',
        ],
      });

      return response.answer;
    } catch (error) {
      throw new BadRequestException(`Failed to search Hyperspell memories: ${error.message}`);
    }
  }

  async queryCalendar(query: string, userId: string = 'anonymous', answer: boolean = true) {
    try {
      const userToken = await this.getUserToken('sandbox:juungbae@gmail.com');
      const client = new Hyperspell({
        apiKey: userToken,
      });

      const response = await client.memories.search({
        query,
        answer,
        sources: ['google_calendar', 'vault'],
      });

      if (response.errors.length > 0) {
        const errorMessages = response.errors.map((err) => err['message']).join(', ');
        throw new BadRequestException(`Failed to query Google Calendar: ${errorMessages}`);
      }
      this.logger.debug(response);

      return {
        answer: response.answer,
        documents: response.documents || [],
      };
    } catch (error) {
      throw new BadRequestException(`Failed to query Google Calendar: ${error.message}`);
    }
  }
}
