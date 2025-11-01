import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repository/users.repository';
import { InboxesRepository } from '../repository/inboxes.repository';
import { GetDashboardRequest, DashboardResponse } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly inboxesRepository: InboxesRepository,
  ) {}

  async getDashboard(request: GetDashboardRequest): Promise<DashboardResponse> {
    this.logger.log(`Fetching dashboard for email: ${request.email}`);

    const user = await this.usersRepository.getByEmail({ email: request.email });

    if (!user) {
      this.logger.warn(`User not found with email: ${request.email}`);
      throw new NotFoundException(`User not found with email: ${request.email}`);
    }

    const inboxes = await this.inboxesRepository.getListByUser({ userId: user._id });

    this.logger.log(
      `Retrieved user ${user.email} with ${inboxes.length} inbox(es)`,
    );

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      email: user.email,
      name: user.name,
      preferences: user.preferences,
      integrations: user.integrations,
      inboxes: inboxes,
    };
  }
}
