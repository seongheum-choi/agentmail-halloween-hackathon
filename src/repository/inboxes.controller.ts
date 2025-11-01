import { Controller, Post, Delete, Body, Param, Logger } from '@nestjs/common';
import { InboxesRepository } from './inboxes.repository';
import { CreateInboxRequest, CreateInboxResponse, DeleteInboxResponse } from './dto/inbox.dto';

@Controller('api/inboxes')
export class InboxesController {
  private readonly logger = new Logger(InboxesController.name);

  constructor(private readonly inboxesRepository: InboxesRepository) {}

  @Post()
  async createInbox(@Body() request: CreateInboxRequest): Promise<CreateInboxResponse> {
    this.logger.log(`Creating inbox: ${request.name}`);
    return this.inboxesRepository.create(request);
  }

  @Delete(':id')
  async deleteInbox(@Param('id') id: string): Promise<DeleteInboxResponse> {
    this.logger.log(`Deleting inbox: ${id}`);
    return this.inboxesRepository.delete({ id });
  }
}
