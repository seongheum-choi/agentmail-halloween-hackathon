import { Controller, Put, Body, Logger } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateUserRequest, UpdateUserResponse } from './dto/user.dto';

@Controller('api/users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @Put()
  async updateUser(@Body() request: UpdateUserRequest): Promise<UpdateUserResponse> {
    this.logger.log(`Updating user: ${request.id}`);
    return this.usersRepository.update(request);
  }
}
