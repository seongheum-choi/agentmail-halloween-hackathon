import { Injectable, Logger } from '@nestjs/common';
import { ConvexClientFactory } from './config/convex.config';
import { api } from '../../convex/_generated/api.js';
import {
  CreateInboxRequest,
  CreateInboxRequestSchema,
  CreateInboxResponse,
  UpdateInboxRequest,
  UpdateInboxRequestSchema,
  UpdateInboxResponse,
  GetInboxByInboxIdRequest,
  GetInboxByInboxIdRequestSchema,
  GetInboxListByUserRequest,
  GetInboxListByUserRequestSchema,
  GetInboxResponse,
  GetInboxListResponse,
  DeleteInboxRequest,
  DeleteInboxRequestSchema,
  DeleteInboxResponse,
  InboxSchema,
} from './dto/inbox.dto';

@Injectable()
export class InboxesRepository {
  private readonly logger = new Logger(InboxesRepository.name);
  private readonly client = ConvexClientFactory.getClient();

  /**
   * Get inbox by inboxId
   * @param request - Request containing inboxId
   * @returns Inbox or null if not found
   */
  async getByInboxId(request: GetInboxByInboxIdRequest): Promise<GetInboxResponse> {
    try {
      // Validate request
      const validatedRequest = GetInboxByInboxIdRequestSchema.parse(request);

      this.logger.log(`Fetching inbox by inboxId: ${validatedRequest.inboxId}`);

      // Query Convex
      const inbox = await this.client.query(api.inbox.getByInboxId, {
        inboxId: validatedRequest.inboxId,
      });

      // Validate and return response
      if (inbox) {
        return InboxSchema.parse(inbox);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get inbox by inboxId: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get list of inboxes by user ID
   * @param request - Request containing user ID
   * @returns Array of inboxes
   */
  async getListByUser(request: GetInboxListByUserRequest): Promise<GetInboxListResponse> {
    try {
      // Validate request
      const validatedRequest = GetInboxListByUserRequestSchema.parse(request);

      this.logger.log(`Fetching inboxes for user: ${validatedRequest.userId}`);

      // Query Convex
      const inboxes = await this.client.query(api.inbox.getListByUser, {
        userId: validatedRequest.userId as any, // Convex ID type
      });

      // Validate and return response
      return inboxes.map((inbox) => InboxSchema.parse(inbox));
    } catch (error) {
      this.logger.error(`Failed to get inboxes by user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a new inbox
   * @param request - Request containing inbox data
   * @returns Created inbox ID
   */
  async create(request: CreateInboxRequest): Promise<CreateInboxResponse> {
    try {
      // Validate request
      const validatedRequest = CreateInboxRequestSchema.parse(request);

      this.logger.log(`Creating inbox: ${validatedRequest.name}`);

      // Mutate Convex
      const inboxId = await this.client.mutation(api.inbox.create, {
        inboxId: validatedRequest.inboxId,
        user: validatedRequest.user as any, // Convex ID type
        name: validatedRequest.name,
        persona: validatedRequest.persona,
      });

      this.logger.log(`Inbox created with ID: ${inboxId}`);

      return inboxId as string;
    } catch (error) {
      this.logger.error(`Failed to create inbox: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update an existing inbox
   * @param request - Request containing inbox ID and update data
   * @returns Updated inbox ID
   */
  async update(request: UpdateInboxRequest): Promise<UpdateInboxResponse> {
    try {
      // Validate request
      const validatedRequest = UpdateInboxRequestSchema.parse(request);

      this.logger.log(`Updating inbox: ${validatedRequest.id}`);

      // Mutate Convex
      const inboxId = await this.client.mutation(api.inbox.update, {
        id: validatedRequest.id as any, // Convex ID type
        ...(validatedRequest.inboxId && { inboxId: validatedRequest.inboxId }),
        ...(validatedRequest.user && { user: validatedRequest.user as any }),
        ...(validatedRequest.name && { name: validatedRequest.name }),
        ...(validatedRequest.persona && { persona: validatedRequest.persona }),
      });

      this.logger.log(`Inbox updated: ${inboxId}`);

      return inboxId as string;
    } catch (error) {
      this.logger.error(`Failed to update inbox: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete an inbox
   * @param request - Request containing inbox ID
   * @returns Deleted inbox ID
   */
  async delete(request: DeleteInboxRequest): Promise<DeleteInboxResponse> {
    try {
      // Validate request
      const validatedRequest = DeleteInboxRequestSchema.parse(request);

      this.logger.log(`Deleting inbox: ${validatedRequest.id}`);

      // Mutate Convex
      const inboxId = await this.client.mutation(api.inbox.remove, {
        id: validatedRequest.id as any, // Convex ID type
      });

      this.logger.log(`Inbox deleted: ${inboxId}`);

      return inboxId as string;
    } catch (error) {
      this.logger.error(`Failed to delete inbox: ${error.message}`, error.stack);
      throw error;
    }
  }
}
