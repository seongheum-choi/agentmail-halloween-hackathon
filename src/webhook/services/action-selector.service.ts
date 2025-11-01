import { Injectable, Logger } from '@nestjs/common';
import { ChatGPTService } from '../../agent/services/chatgpt.service';
import { z } from 'zod';
import { EmailAction, EmailContext, ActionSelectionResult } from '../types/action.types';

const ActionSelectionSchema = z.object({
  action: z.enum(['OFFER', 'CHECK_TIME', 'CONFIRM', 'COUNTEROFFER']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
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
        content: `You are an AI assistant that analyzes reservation-related emails and selects the appropriate action.

For INITIAL emails (first contact), you can select from these actions:

1. OFFER - Use when:
   - Email expresses interest in making a reservation
   - Email has a purpose (e.g., "I'd like to book a table") but NO specific time suggestion
   - Sender is inquiring about availability without proposing a time
   Example: "Hi, I'd like to make a dinner reservation for 4 people"

2. CHECK_TIME - Use when:
   - Email has both a purpose AND a specific time suggestion
   - Sender proposes a specific date/time for the reservation
   - Email contains phrases like "at 7pm", "on Friday", "next Tuesday at noon"
   Example: "I'd like to book a table for 4 people this Friday at 7pm"

3. CONFIRM - Use when:
   - Email is accepting/confirming a previous offer or time suggestion
   - Contains acceptance language like "yes", "confirmed", "that works", "sounds good"
   - Responding positively to a previous proposal
   Example: "Yes, that time works for me. See you then!"

Respond with a JSON object containing:
- action: One of ["OFFER", "CHECK_TIME", "CONFIRM"]
- confidence: A number between 0 and 1 indicating your confidence
- reasoning: Brief explanation of why you selected this action`,
      };
    } else {
      return {
        role: 'system',
        content: `You are an AI assistant that analyzes reservation-related emails after a CHECK_TIME action.

After sending a CHECK_TIME response, you can select from these actions:

1. CONFIRM - Use when:
   - Sender accepts the proposed time
   - Contains confirmation language like "yes", "confirmed", "that works", "sounds good"
   - Positive response to the time suggestion
   Example: "Yes, 7pm works perfectly for us"

2. COUNTEROFFER - Use when:
   - Sender rejects the proposed time
   - Sender suggests an alternative time
   - Contains phrases like "can't make it", "how about", "is X available instead"
   - Time is not suitable for the sender
   Example: "7pm doesn't work for me. Is 8pm available?"

Respond with a JSON object containing:
- action: One of ["CONFIRM", "COUNTEROFFER"]
- confidence: A number between 0 and 1 indicating your confidence
- reasoning: Brief explanation of why you selected this action`,
      };
    }
  }
}
