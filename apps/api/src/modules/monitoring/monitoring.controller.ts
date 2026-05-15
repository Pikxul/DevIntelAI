import { Controller, Post, Body, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import type { MetricSnapshot } from '@aidevops/shared-types';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  @Post('metrics')
  @ApiOperation({ summary: 'Ingest metrics snapshot and run AI anomaly detection' })
  ingestMetrics(
    @Body() body: { deploymentId: string; metrics: MetricSnapshot },
  ) {
    return this.service.ingestMetrics(body.deploymentId, body.metrics);
  }

  @Get('anomalies')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List detected anomalies' })
  getAnomalies(@Query('deploymentId') deploymentId?: string, @Query('limit') limit?: string) {
    return this.service.getAnomalies(deploymentId, limit ? parseInt(limit) : 20);
  }
}
