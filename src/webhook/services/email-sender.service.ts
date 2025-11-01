import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailWithInvite {
  from: string;
  to: string;
  subject: string;
  text: string;
  icsContent: string;
}

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendEmailWithCalendarInvite(emailDetails: EmailWithInvite): Promise<void> {
    this.logger.log(`Sending email with calendar invite to: ${emailDetails.to}`);

    try {
      await this.transporter.sendMail({
        from: emailDetails.from,
        to: emailDetails.to,
        subject: emailDetails.subject,
        text: emailDetails.text,
        alternatives: [
          {
            contentType: 'text/calendar; method=REQUEST; charset="UTF-8"',
            content: emailDetails.icsContent,
          },
        ],
        icalEvent: {
          filename: 'invite.ics',
          content: emailDetails.icsContent,
        },
      });

      this.logger.log(`Email sent successfully to: ${emailDetails.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }
}
