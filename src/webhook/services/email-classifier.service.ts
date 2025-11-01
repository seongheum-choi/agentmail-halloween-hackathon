import { Injectable, Logger } from '@nestjs/common';
import { ChatGPTService } from '../../agent/services/chatgpt.service';
import { z } from 'zod';

const ClassificationResultSchema = z.object({
  labels: z.array(z.string()),
  isSpam: z.boolean(),
  isReservation: z.boolean(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

@Injectable()
export class EmailClassifierService {
  private readonly logger = new Logger(EmailClassifierService.name);

  constructor(private readonly chatGPTService: ChatGPTService) {}

  async classifyEmail(subject: string, text: string): Promise<ClassificationResult> {
    this.logger.log(`Classifying email: ${subject}`);

    try {
      const systemMessage = {
        role: 'system' as const,
        content: `You are an email classification system of secretaries. Classify emails into one or more of these categories: SPAM, RESERVATION.

Rules:
- SPAM: Unsolicited commercial emails, phishing attempts, suspicious content
- RESERVATION: Emails about appointments, reservations at businesses, meeting or conference calls.

Respond ONLY with a JSON object in this exact format:
{"labels": ["LABEL1", "LABEL2"], "isSpam": boolean, "isReservation": boolean}

Examples:
- Hotel booking confirmation -> {"labels": ["RESERVATION"], "isSpam": false, "isReservation": true}
- Promotional email -> {"labels": ["SPAM"], "isSpam": true, "isReservation": false}
- Restaurant reservation -> {"labels": ["RESERVATION"], "isSpam": false, "isReservation": true}`,
      };

      const userMessage = `Subject: ${subject}\n\nBody: ${text.substring(0, 1000)}`;

      const result = await this.chatGPTService.sendMessageWithFormat(
        userMessage,
        ClassificationResultSchema,
        'EmailClassification',
        [systemMessage],
        0.3,
        100,
      );

      this.logger.log(`Classification result: ${JSON.stringify(result)}`);

      return result;
    } catch (error) {
      this.logger.error(`Error classifying email: ${error.message}`);
      return {
        labels: [],
        isSpam: false,
        isReservation: false,
      };
    }
  }
}
