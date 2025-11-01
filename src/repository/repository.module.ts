import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { InboxesRepository } from './inboxes.repository';

@Module({
  providers: [UsersRepository, InboxesRepository],
  exports: [UsersRepository, InboxesRepository],
})
export class RepositoryModule {}
