import { Controller, Get, Query, Logger, BadRequestException, Render } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { GetDashboardRequestSchema } from './dto/dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Render('dashboard')
  async getDashboard(@Query('email') email: string) {
    this.logger.log(`GET /dashboard?email=${email}`);

    if (!email) {
      throw new BadRequestException('Email query parameter is required');
    }

    const validatedRequest = GetDashboardRequestSchema.parse({ email });

    const dashboardData = await this.dashboardService.getDashboard(validatedRequest);

    return dashboardData;
  }
}
