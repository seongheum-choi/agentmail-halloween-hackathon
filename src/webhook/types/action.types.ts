export enum EmailAction {
  OFFER = 'OFFER',
  CHECK_TIME = 'CHECK_TIME',
  CONFIRM = 'CONFIRM',
  COUNTEROFFER = 'COUNTEROFFER',
}

export enum EmailContext {
  INITIAL = 'INITIAL',
  AFTER_CHECK_TIME = 'AFTER_CHECK_TIME',
}

export interface ActionSelectionResult {
  action: EmailAction;
  confidence: number;
  reasoning: string;
  timeSuggestions?: TimeSlot[] | null;
}

// Email generation context types
export interface TimeSlot {
  date: string; // ISO 8601 format
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface OfferEmailContext {
  availableTimeSlots: TimeSlot[];
}

export interface ConfirmEmailContext {
  confirmedTimeSlot: TimeSlot;
}

export interface CounterOfferEmailContext {
  proposedTimeSlot: TimeSlot;
  alternativeTimeSlots: TimeSlot[];
}

export interface CheckTimeEmailContext {
  timeSuggestions?: TimeSlot[];
}

export type EmailGenerationContext =
  | OfferEmailContext
  | ConfirmEmailContext
  | CounterOfferEmailContext
  | CheckTimeEmailContext;

export interface EmailGenerationRequest {
  action: EmailAction;
  context: EmailGenerationContext;
  recipientName?: string;
  senderName?: string;
  meetingPurpose?: string;
}
