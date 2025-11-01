import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Query: Get inbox by inboxId
export const getByInboxId = query({
  args: { inboxId: v.string() },
  handler: async (ctx, args) => {
    const inbox = await ctx.db
      .query('inboxes')
      .filter((q) => q.eq(q.field('inboxId'), args.inboxId))
      .first();
    return inbox;
  },
});

// Query: Get list of inboxes by user ID
export const getListByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const inboxes = await ctx.db
      .query('inboxes')
      .filter((q) => q.eq(q.field('user'), args.userId))
      .collect();
    return inboxes;
  },
});

// Mutation: Create a new inbox
export const create = mutation({
  args: {
    inboxId: v.string(),
    user: v.id('users'),
    name: v.string(),
    persona: v.string(),
  },
  handler: async (ctx, args) => {
    const inboxId = await ctx.db.insert('inboxes', {
      inboxId: args.inboxId,
      user: args.user,
      name: args.name,
      persona: args.persona,
    });
    return inboxId;
  },
});

// Mutation: Update an existing inbox
export const update = mutation({
  args: {
    id: v.id('inboxes'),
    inboxId: v.optional(v.string()),
    user: v.optional(v.id('users')),
    name: v.optional(v.string()),
    persona: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Mutation: Delete an inbox
export const remove = mutation({
  args: { id: v.id('inboxes') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});
