import { Controller, Get, Query, UseGuards, Res, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dora')
  @RequirePermission('analytics:view')
  @ApiOperation({ summary: 'Get DORA four key metrics for an organization' })
  getDora(
    @Request() req: any,
    @Query('projectId') projectId?: string,
    @Query('days') days?: string,
  ) {
    return this.service.getDoraMetrics(
      req.user.organizationId,
      days ? parseInt(days) : 30,
      projectId
    );
  }

  @Get('dora/export')
  @RequirePermission('analytics:view')
  @ApiOperation({ summary: 'Export DORA metrics in CSV format for compliance reporting' })
  async exportDoraMetrics(
    @Res() res: Response,
    @Request() req: any,
    @Query('projectId') projectId?: string,
    @Query('days') days?: string,
  ) {
    const organizationId = req.user.organizationId;
    const period = days ? parseInt(days) : 30;
    const metrics = await this.service.getDoraMetrics(organizationId, period, projectId);

    const csvLines = [
      `DORA Analytics Report,${projectId ? `Project: ${projectId}` : 'Organization Aggregate'}`,
      `Reporting Period,Last ${period} Days`,
      `Generated At,${new Date().toISOString()}`,
      ``,
      `Metric Name,Value,Performance Tier`,
      `Deployment Frequency (Daily),${metrics.deploymentFrequency.daily},${metrics.deploymentFrequency.label}`,
      `Deployment Frequency (Weekly),${metrics.deploymentFrequency.weekly},${metrics.deploymentFrequency.label}`,
      `Lead Time for Changes (Hours),${metrics.leadTime.avgHours},${metrics.leadTime.label}`,
      `Change Failure Rate (%),${metrics.changeFailureRate.percentage}%,${metrics.changeFailureRate.label}`,
      `Mean Time to Restore (MTTR Minutes),${metrics.mttr.avgMinutes},${metrics.mttr.label}`,
      ``,
      `DORA Metrics Trend Summary (Last 8 Days)`,
      `Date,Deployments,Failures,MTTR (Min)`
    ];

    metrics.trend.forEach(t => {
      csvLines.push(`${t.date},${t.deployments},${t.failures},${t.mttr}`);
    });

    const csvContent = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=dora-metrics-${organizationId}-${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  }
}
