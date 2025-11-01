import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ClassificationResult {
  labels: string[];
  isSpam: boolean;
  isReservation: boolean;
}

@Injectable()
export class EmailClassifierService {
  private readonly logger = new Logger(EmailClassifierService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not found in environment variables');
    }
    this.openai = new OpenAI({
      apiKey: apiKey || '',
    });
  }

  async classifyEmail(subject: string, text: string): Promise<ClassificationResult> {
    this.logger.log(`Classifying email: ${subject}`);

    try {
      const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';

      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an email classification system. Classify emails into one or more of these categories: SPAM, RESERVATION.

Rules:
- SPAM: Unsolicited commercial emails, phishing attempts, suspicious content
- RESERVATION: Emails about bookings, appointments, reservations at restaurants, hotels, events, etc.

Respond ONLY with a JSON object in this exact format:
{"labels": ["LABEL1", "LABEL2"], "isSpam": boolean, "isReservation": boolean}

Examples:
- Hotel booking confirmation -> {"labels": ["RESERVATION"], "isSpam": false, "isReservation": true}
- Promotional email -> {"labels": ["SPAM"], "isSpam": true, "isReservation": false}
- Restaurant reservation -> {"labels": ["RESERVATION"], "isSpam": false, "isReservation": true}`,
          },
          {
            role: 'user',
            content: `Subject: ${subject}\n\nBody: ${text.substring(0, 1000)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content) as ClassificationResult;
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
