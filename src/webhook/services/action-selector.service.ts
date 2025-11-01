import { Injectable, Logger } from '@nestjs/common';
import { ChatGPTService } from '../../agent/services/chatgpt.service';
import { z } from 'zod';
import { EmailAction, EmailContext, ActionSelectionResult } from '../types/action.types';

const ActionSelectionSchema = z.object({
  action: z.enum(['OFFER', 'CHECK_TIME', 'CONFIRM', 'COUNTEROFFER']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  timeSuggestion: z.string().nullable().optional(),
});

@Injectable()
export class ActionSelectorService {
  private readonly logger = new Logger(ActionSelectorService.name);

  constructor(private readonly chatGPTService: ChatGPTService) {}

  async selectAction(
    subject: string,
    text: string,
    context: EmailContext = EmailContext.INITIAL,
  ): Promise<ActionSelectionResult> {
    this.logger.log(`Selecting action for email: ${subject} (context: ${context})`);

    try {
      const systemMessage = this.buildSystemMessage(context);
      const userMessage = `Subject: ${subject}\n\nBody: ${text}`;

      const result = await this.chatGPTService.sendMessageWithFormat(
        userMessage,
        ActionSelectionSchema,
        'ActionSelection',
        [systemMessage],
        0.3,
        200,
      );

      this.logger.log(`Action selected: ${result.action} (confidence: ${result.confidence})`);

      return {
        action: result.action as EmailAction,
        confidence: result.confidence,
        reasoning: result.reasoning,
        timeSuggestion: result.timeSuggestion,
      };
    } catch (error) {
      this.logger.error(`Error selecting action: ${error.message}`);
      return {
        action: EmailAction.OFFER,
        confidence: 0,
        reasoning: 'Error occurred during action selection',
      };
    }
  }

  private buildSystemMessage(context: EmailContext): { role: 'system'; content: string } {
    if (context === EmailContext.INITIAL) {
      return {
        role: 'system',
        content: `You are an AI secretary that analyzes reservation-related emails and selects the appropriate action.

For INITIAL emails (first contact), you can select from these actions:

1. OFFER - Use when:
   - Email expresses interest in making a reservation
   - Email has a purpose (e.g., "I'd like to make a sales call") but NO specific time suggestion
   - Sender is inquiring about availability without proposing a time
   Example: "Hi, I'd like to book a demo call sometime next week."

2. CHECK_TIME - Use when:
   - Email has both a purpose AND a specific time suggestion
   - Sender proposes a specific date/time for the reservation
   - Email contains phrases like "at 7pm", "on Friday", "next Tuesday at noon"
   Example: "Hi, I'd like to book a demo call this Friday at 7pm"

3. CONFIRM - Use when:
   - Email is accepting/confirming a previous offer or time suggestion
   - Email have context of prior communication about time
   - Contains acceptance language like "yes", "confirmed", "that works", "sounds good"
   - No response.
   Example: "Yes, that time works for me. See you then!"

Respond with a JSON object containing:
- action: One of ["OFFER", "CHECK_TIME", "CONFIRM"]
- reasoning: Brief explanation of why you selected this action
- timeInformation: If action is CHECK_TIME or CONFIRM, extract and provide the proposed date/time as a TimeSlot structure. Otherwise, set to null.`,
      };
    } else {
      return {
        role: 'system',
        content: `You are an AI secretary that analyzes reservation-related emails with given time-context.

With time context, you can select from these actions:

1. CONFIRM - Use when:
   - You can confirm the proposed time. If no information or no schedule, it can be confirmed.

2. COUNTEROFFER - Use when:
   - You cannot confirm the proposed time and need to suggest an alternative.

Respond with a JSON object containing:
- action: One of ["CONFIRM", "COUNTEROFFER"]
- reasoning: Brief explanation of why you selected this action`,
      };
    }
  }
}
