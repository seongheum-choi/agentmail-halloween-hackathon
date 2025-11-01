import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentMailClient } from 'agentmail';
import { ListThreadsDto } from '../dto/list-threads.dto';

@Injectable()
export class AgentMailService {
  private readonly logger = new Logger(AgentMailService.name);
  private readonly client: AgentMailClient;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('AGENTMAIL_API_KEY');
    if (!apiKey) {
      throw new Error('AGENTMAIL_API_KEY is not configured');
    }
    this.client = new AgentMailClient({ apiKey });
    this.logger.log('AgentMail client initialized');
  }

  async listInboxes() {
    try {
      this.logger.log('Fetching inboxes');
      const inboxes = [];
      const pageableResponse = await this.client.inboxes.list();
      for await (const inbox of pageableResponse.inboxes) {
        inboxes.push(inbox);
      }
      this.logger.log(`Fetched ${inboxes.length} inboxes`);
      return inboxes;
    } catch (error) {
      this.logger.error('Error fetching inboxes', error);
      throw error;
    }
  }

  async listThreads(params?: ListThreadsDto) {
    try {
      this.logger.log('Fetching threads', params);
      const threads = [];
      const pageableResponse = await this.client.threads.list({
        limit: params?.limit,
        pageToken: params?.pageToken,
        labels: params?.labels,
        before: new Date(params?.before),
        after: new Date(params?.after),
        ascending: params?.ascending,
      });
      for await (const thread of pageableResponse.threads) {
        threads.push(thread);
      }
      this.logger.log(`Fetched ${threads.length} threads`);
      return threads;
    } catch (error) {
      this.logger.error('Error fetching threads', error);
      throw error;
    }
  }

  async getThread(threadId: string) {
    try {
      this.logger.log(`Fetching thread: ${threadId}`);
      const thread = await this.client.threads.get(threadId);
      this.logger.log(`Fetched thread: ${threadId}`);
      return thread;
    } catch (error) {
      this.logger.error(`Error fetching thread: ${threadId}`, error);
      throw error;
    }
  }

  async getThreadAttachment(threadId: string, attachmentId: string) {
    try {
      this.logger.log(`Fetching attachment ${attachmentId} from thread ${threadId}`);
      const attachment = await this.client.threads.getAttachment(threadId, attachmentId);
      this.logger.log(`Fetched attachment ${attachmentId} from thread ${threadId}`);
      return attachment;
    } catch (error) {
      this.logger.error(`Error fetching attachment ${attachmentId} from thread ${threadId}`, error);
      throw error;
    }
  }
}
