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
    preferences: v.optional(
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
    const { id, preferences, email, name, integrations } = args;

    // First, get the current user to replace it entirely
    const currentUser: any = await ctx.db.get(id);
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Build the updated user object, ensuring we only include valid fields
    // Use preferences from currentUser (not preferences) as the base
    const updatedUser = {
      email: email !== undefined ? email : currentUser.email,
      name: name !== undefined ? name : currentUser.name,
      preferences: preferences !== undefined ? preferences : currentUser.preferences,
      integrations: integrations !== undefined ? integrations : currentUser.integrations,
    };

    // Replace the document entirely to remove any invalid fields like 'preferences'
    await ctx.db.replace(id, updatedUser);
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
