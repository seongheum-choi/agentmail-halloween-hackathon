import { z } from 'zod';

// Zod Schemas
export const InboxSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  inboxId: z.string(),
  user: z.string(), // Reference to user ID
  name: z.string(),
  persona: z.string(),
});

export const CreateInboxRequestSchema = z.object({
  inboxId: z.string(),
  user: z.string(), // User ID
  name: z.string(),
  persona: z.string(),
});

export const UpdateInboxRequestSchema = z.object({
  id: z.string(),
  inboxId: z.string().optional(),
  user: z.string().optional(),
  name: z.string().optional(),
  persona: z.string().optional(),
});

export const GetInboxByInboxIdRequestSchema = z.object({
  inboxId: z.string(),
});

export const GetInboxListByUserRequestSchema = z.object({
  userId: z.string(),
});

export const DeleteInboxRequestSchema = z.object({
  id: z.string(),
});

// TypeScript Types
export type Inbox = z.infer<typeof InboxSchema>;
export type CreateInboxRequest = z.infer<typeof CreateInboxRequestSchema>;
export type UpdateInboxRequest = z.infer<typeof UpdateInboxRequestSchema>;
export type GetInboxByInboxIdRequest = z.infer<typeof GetInboxByInboxIdRequestSchema>;
export type GetInboxListByUserRequest = z.infer<typeof GetInboxListByUserRequestSchema>;
export type DeleteInboxRequest = z.infer<typeof DeleteInboxRequestSchema>;

// Response Types
export type CreateInboxResponse = string; // inboxId
export type UpdateInboxResponse = string; // inboxId
export type GetInboxResponse = Inbox | null;
export type GetInboxListResponse = Inbox[];
export type DeleteInboxResponse = string; // inboxId
