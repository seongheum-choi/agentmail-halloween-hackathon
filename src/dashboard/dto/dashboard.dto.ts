import { z } from 'zod';
import { InboxSchema } from '../../repository/dto/inbox.dto';

export const GetDashboardRequestSchema = z.object({
  email: z.string().email(),
});

export const DashboardResponseSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  email: z.string().email(),
  name: z.string(),
  preferences: z.object({
    timezone: z.string(),
    workingHours: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }),
  integrations: z.object({
    agentMail: z.string(),
  }),
  inboxes: z.array(InboxSchema),
});

export type GetDashboardRequest = z.infer<typeof GetDashboardRequestSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
