import { z } from 'zod';

// Zod Schemas
export const WorkingHoursSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const PreferencesSchema = z.object({
  timezone: z.string(),
  workingHours: WorkingHoursSchema,
});

export const IntegrationsSchema = z.object({
  agentMail: z.string(),
});

export const UserSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  email: z.string().email(),
  name: z.string(),
  preferences: PreferencesSchema,
  integrations: IntegrationsSchema,
});

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  preferences: PreferencesSchema,
  integrations: IntegrationsSchema,
});

export const UpdateUserRequestSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  preferences: PreferencesSchema.optional(),
  integrations: IntegrationsSchema.optional(),
});

export const GetUserByEmailRequestSchema = z.object({
  email: z.string().email(),
});

export const GetUserByIdRequestSchema = z.object({
  id: z.string(),
});

export const DeleteUserRequestSchema = z.object({
  id: z.string(),
});

// TypeScript Types
export type WorkingHours = z.infer<typeof WorkingHoursSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type Integrations = z.infer<typeof IntegrationsSchema>;
export type User = z.infer<typeof UserSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type GetUserByEmailRequest = z.infer<typeof GetUserByEmailRequestSchema>;
export type GetUserByIdRequest = z.infer<typeof GetUserByIdRequestSchema>;
export type DeleteUserRequest = z.infer<typeof DeleteUserRequestSchema>;

// Response Types
export type CreateUserResponse = string; // userId
export type UpdateUserResponse = string; // userId
export type GetUserResponse = User | null;
export type DeleteUserResponse = string; // userId
