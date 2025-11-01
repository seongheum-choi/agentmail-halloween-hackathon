import { Injectable, Logger } from '@nestjs/common';
import { ConvexClientFactory } from './config/convex.config';
import { api } from '../../convex/_generated/api';
import {
  CreateUserRequest,
  CreateUserRequestSchema,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserRequestSchema,
  UpdateUserResponse,
  GetUserByEmailRequest,
  GetUserByEmailRequestSchema,
  GetUserByIdRequest,
  GetUserByIdRequestSchema,
  GetUserResponse,
  DeleteUserRequest,
  DeleteUserRequestSchema,
  DeleteUserResponse,
  UserSchema,
} from './dto/user.dto';

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);
  private readonly client = ConvexClientFactory.getClient();

  /**
   * Get user by email
   * @param request - Request containing user email
   * @returns User or null if not found
   */
  async getByEmail(request: GetUserByEmailRequest): Promise<GetUserResponse> {
    try {
      // Validate request
      const validatedRequest = GetUserByEmailRequestSchema.parse(request);

      this.logger.log(`Fetching user by email: ${validatedRequest.email}`);

      // Query Convex
      const user = await this.client.query(api.user.getByEmail, {
        email: validatedRequest.email,
      });

      // Validate and return response
      if (user) {
        return UserSchema.parse(user);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get user by email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param request - Request containing user ID
   * @returns User or null if not found
   */
  async getById(request: GetUserByIdRequest): Promise<GetUserResponse> {
    try {
      // Validate request
      const validatedRequest = GetUserByIdRequestSchema.parse(request);

      this.logger.log(`Fetching user by ID: ${validatedRequest.id}`);

      // Query Convex
      const user = await this.client.query(api.user.getById, {
        id: validatedRequest.id as any, // Convex ID type
      });

      // Validate and return response
      if (user) {
        return UserSchema.parse(user);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get user by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param request - Request containing user data
   * @returns Created user ID
   */
  async create(request: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      // Validate request
      const validatedRequest = CreateUserRequestSchema.parse(request);

      this.logger.log(`Creating user: ${validatedRequest.email}`);

      // Mutate Convex
      const userId = await this.client.mutation(api.user.create, {
        email: validatedRequest.email,
        name: validatedRequest.name,
        preferences: validatedRequest.preferences,
        integrations: validatedRequest.integrations,
      });

      this.logger.log(`User created with ID: ${userId}`);

      return userId as string;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update an existing user
   * @param request - Request containing user ID and update data
   * @returns Updated user ID
   */
  async update(request: UpdateUserRequest): Promise<UpdateUserResponse> {
    try {
      // Validate request
      const validatedRequest = UpdateUserRequestSchema.parse(request);

      this.logger.log(`Updating user: ${validatedRequest.id}`);

      // Mutate Convex
      const userId = await this.client.mutation(api.user.update, {
        id: validatedRequest.id as any, // Convex ID type
        ...(validatedRequest.email && { email: validatedRequest.email }),
        ...(validatedRequest.name && { name: validatedRequest.name }),
        ...(validatedRequest.preferences && { preferences: validatedRequest.preferences }),
        ...(validatedRequest.integrations && { integrations: validatedRequest.integrations }),
      });

      this.logger.log(`User updated: ${userId}`);

      return userId as string;
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a user
   * @param request - Request containing user ID
   * @returns Deleted user ID
   */
  async delete(request: DeleteUserRequest): Promise<DeleteUserResponse> {
    try {
      // Validate request
      const validatedRequest = DeleteUserRequestSchema.parse(request);

      this.logger.log(`Deleting user: ${validatedRequest.id}`);

      // Mutate Convex
      const userId = await this.client.mutation(api.user.remove, {
        id: validatedRequest.id as any, // Convex ID type
      });

      this.logger.log(`User deleted: ${userId}`);

      return userId as string;
    } catch (error) {
      this.logger.error(`Failed to delete user: ${error.message}`, error.stack);
      throw error;
    }
  }
}
