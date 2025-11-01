import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { InboxesRepository } from './inboxes.repository';
import { UsersController } from './users.controller';
import { InboxesController } from './inboxes.controller';

@Module({
  controllers: [UsersController, InboxesController],
  providers: [UsersRepository, InboxesRepository],
  exports: [UsersRepository, InboxesRepository],
})
export class RepositoryModule {}
