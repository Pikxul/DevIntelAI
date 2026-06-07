import { Controller, Post, Body, Get, Put, Query, Param, UseGuards, Req, Headers, RawBodyRequest, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { IncidentsService } from './incidents.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import type { MetricSnapshot } from '@aidevops/shared-types';
import { SkipTenantCheck } from '../auth/skip-tenant-check.decorator';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly service: MonitoringService,
    private readonly incidentsService: IncidentsService,
    private readonly cfg: ConfigService,
  ) {}

  @Post('metrics')
  @ApiOperation({ summary: 'Ingest metrics snapshot and run AI anomaly detection' })
  ingestMetrics(
    @Body() body: { deploymentId: string; metrics: MetricSnapshot },
  ) {
    return this.service.ingestMetrics(body.deploymentId, body.metrics);
  }

  @Post('incidents/webhook')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Webhook endpoint for external incident alerts (Datadog, Prometheus, etc.)' })
  async handleIncidentWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-webhook-signature') signature: string,
    @Body() payload: any,
  ) {
    const secret = this.cfg.get<string>('INCIDENT_WEBHOOK_SECRET');
    if (secret) {
      if (!signature) {
        throw new UnauthorizedException('Missing incident webhook signature');
      }
      if (!req.rawBody) {
        throw new UnauthorizedException('Missing raw request body for signature verification');
      }
      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
      try {
        const valid = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
        if (!valid) throw new UnauthorizedException('Invalid incident webhook signature');
      } catch {
        throw new UnauthorizedException('Invalid incident webhook signature');
      }
    }
    return this.incidentsService.handleIncidentWebhook(payload);
  }

  @Get('alerts/active')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get active anomaly alerts' })
  getActiveAlerts() {
    return this.service.getActiveAlerts();
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

  @Get('incidents/stats')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get incident aggregate statistics' })
  getIncidentStats() {
    return this.incidentsService.getStats();
  }

  @Get('incidents/:id/rca')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get RCA for an incident' })
  getRCA(@Param('id') incidentId: string) {
    return this.incidentsService.getRCA(incidentId);
  }

  @Get('incidents/:id/timeline')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get timeline events for an incident' })
  getIncidentTimeline(@Param('id') incidentId: string) {
    return this.incidentsService.getTimeline(incidentId);
  }

  @Put('incidents/:id/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update incident status (open/investigating/resolved)' })
  updateIncidentStatus(
    @Param('id') incidentId: string,
    @Body() body: { status: string },
  ) {
    return this.incidentsService.updateStatus(incidentId, body.status);
  }
}

