export interface EnrichedMessage {
  id: string;
  inboxId: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  receivedAt: string;
  labels: string[];
  isSpam: boolean;
  isReservation: boolean;
}
