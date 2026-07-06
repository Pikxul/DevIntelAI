import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeploymentsService } from './deployments.service';
import type { DeploymentTarget } from '@aidevops/shared-types';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { GovernanceService } from '../governance/governance.service';

@ApiTags('deployments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('deployments')
export class DeploymentsController {
  constructor(
    private readonly service: DeploymentsService,
    private readonly governanceService: GovernanceService,
  ) {}

  @Post()
  @RequirePermission('pipeline:trigger')
  @ApiOperation({ summary: 'Trigger a deployment' })
  deploy(@Body() body: { pipelineRunId: string; target: DeploymentTarget; imageTag: string; previousImageTag?: string }) {
    return this.service.deploy(body);
  }

  @Post(':id/rollback')
  @RequirePermission('deployment:rollback')
  @ApiOperation({ summary: 'Rollback a deployment' })
  async rollback(@Param('id') id: string, @Body() body: { reason: string }, @Request() req: any) {
    const deployment = await this.service.rollback(id, body.reason, req.user.organizationId);
    const user = req.user;
    if (user && deployment) {
      await this.governanceService.addAuditLog({
        organizationId: user.organizationId,
        userId: user.userId,
        userEmail: user.email,
        action: 'rollback_deployment',
        resource: 'deployment',
        resourceId: id,
        details: `Triggered rollback: "${body.reason}"`,
      });
    }
    return deployment;
  }

  @Get()
  @RequirePermission('deployment:view')
  @ApiOperation({ summary: 'List recent deployments' })
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.organizationId);
  }

  @Get('stats')
  @RequirePermission('deployment:view')
  @ApiOperation({ summary: 'Get deployment aggregate statistics' })
  getStats(@Request() req: any) {
    return this.service.getStats(req.user.organizationId);
  }

  @Get(':id')
  @RequirePermission('deployment:view')
  @ApiOperation({ summary: 'Get deployment details' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }
}
