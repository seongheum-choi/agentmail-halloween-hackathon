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
}
