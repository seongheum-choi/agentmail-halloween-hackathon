import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    preferences: v.object({
      timezone: v.string(),
      workingHours: v.object({
        start: v.string(),
        end: v.string(),
      }),
    }),
    integrations: v.object({
      agentMail: v.string(),
    }),
  }).index('by_email', ['email']),
  inboxes: defineTable({
    inboxId: v.string(),
    user: v.id('users'),
    name: v.string(),
    persona: v.string(),
  }).index('by_inbox_id', ['inboxId']),
});
