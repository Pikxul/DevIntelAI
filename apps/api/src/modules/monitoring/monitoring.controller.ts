import { Controller, Post, Body, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { IncidentsService } from './incidents.service';
import type { MetricSnapshot } from '@aidevops/shared-types';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly service: MonitoringService,
    private readonly incidentsService: IncidentsService,
  ) {}

  @Post('metrics')
  @ApiOperation({ summary: 'Ingest metrics snapshot and run AI anomaly detection' })
  ingestMetrics(
    @Body() body: { deploymentId: string; metrics: MetricSnapshot },
  ) {
    return this.service.ingestMetrics(body.deploymentId, body.metrics);
  }

  @Post('incidents/webhook')
  @ApiOperation({ summary: 'Webhook endpoint for external incident alerts (Datadog, Prometheus, etc.)' })
  handleIncidentWebhook(@Body() payload: any) {
    return this.incidentsService.handleIncidentWebhook(payload);
  }

  @Get('anomalies')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List detected anomalies' })
  getAnomalies(@Query('deploymentId') deploymentId?: string, @Query('limit') limit?: string) {
    return this.service.getAnomalies(deploymentId, limit ? parseInt(limit) : 20);
  }

  @Get('incidents')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List incident alerts' })
  getIncidents(@Query('projectId') projectId?: string) {
    return this.incidentsService.getIncidents(projectId);
  }

  @Get('incidents/:id/rca')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get RCA for an incident' })
  getRCA(@Param('id') incidentId: string) {
    return this.incidentsService.getRCA(incidentId);
  }
}
