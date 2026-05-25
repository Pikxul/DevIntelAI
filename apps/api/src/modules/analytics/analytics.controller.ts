import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dora')
  @ApiOperation({ summary: 'Get DORA four key metrics for an organization' })
  getDora(
    @Query('organizationId') organizationId: string,
    @Query('days') days?: string,
  ) {
    return this.service.getDoraMetrics(organizationId, days ? parseInt(days) : 30);
  }
}
