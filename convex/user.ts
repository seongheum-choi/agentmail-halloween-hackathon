import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Query: Get user by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), args.email))
      .first();
    return user;
  },
});

// Query: Get user by ID
export const getById = query({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    return user;
  },
});

// Mutation: Create a new user
export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      preferences: args.preferences,
      integrations: args.integrations,
    });
    return userId;
  },
});

// Mutation: Update an existing user
export const update = mutation({
  args: {
    id: v.id('users'),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    settings: v.optional(
      v.object({
        timezone: v.string(),
        workingHours: v.object({
          start: v.string(),
          end: v.string(),
        }),
      }),
    ),
    integrations: v.optional(
      v.object({
        agentMail: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Mutation: Delete a user
export const remove = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});
