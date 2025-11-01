# User Repository

NestJS repository for managing users with Convex backend and Zod validation.

## Setup

1. Add `CONVEX_URL` to your `.env` file:
```bash
CONVEX_URL=https://your-convex-deployment.convex.cloud
```

2. Import the `RepositoryModule` in your module:
```typescript
import { RepositoryModule } from './repository/repository.module';

@Module({
  imports: [RepositoryModule],
  // ...
})
export class YourModule {}
```

## Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { UsersRepository } from './repository/users.repository';

@Injectable()
export class UserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUserByEmail(email: string) {
    return await this.usersRepository.getByEmail({ email });
  }

  async getUserById(id: string) {
    return await this.usersRepository.getById({ id });
  }

  async createUser() {
    return await this.usersRepository.create({
      email: 'user@example.com',
      name: 'John Doe',
      preferences: {
        timezone: 'America/New_York',
        workingHours: {
          start: '09:00',
          end: '17:00',
        },
      },
      integrations: {
        agentMail: 'agent@example.com',
      },
    });
  }

  async updateUser(id: string) {
    return await this.usersRepository.update({
      id,
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
  }

  async deleteUser(id: string) {
    return await this.usersRepository.delete({ id });
  }
}
```

## API Methods

### `getByEmail(request: GetUserByEmailRequest): Promise<User | null>`
Retrieves a user by email address.

### `getById(request: GetUserByIdRequest): Promise<User | null>`
Retrieves a user by ID.

### `create(request: CreateUserRequest): Promise<string>`
Creates a new user and returns the user ID.

### `update(request: UpdateUserRequest): Promise<string>`
Updates an existing user and returns the user ID.

### `delete(request: DeleteUserRequest): Promise<string>`
Deletes a user and returns the user ID.

## Validation

All requests and responses are validated using Zod schemas defined in [dto/user.dto.ts](dto/user.dto.ts).

## Error Handling

All methods include error handling and logging. Errors are logged with the NestJS Logger and re-thrown for handling at the service/controller level.
