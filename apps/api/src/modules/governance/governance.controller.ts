import { Controller, Get, Put, Post, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { GovernanceService } from './governance.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('governance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('governance')
export class GovernanceController {
  constructor(private readonly service: GovernanceService) {}

  // ─── Members ─────────────────────────────────────────────────────────────────

  @Get('members')
  @Roles('viewer', 'developer', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List organization members' })
  getMembers(@Query('organizationId') organizationId: string) {
    return this.service.getMembers(organizationId);
  }

  @Put('members/:id/role')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update member role' })
  updateRole(
    @Param('id') id: string,
    @Body() body: { role: string; actorEmail?: string },
  ) {
    return this.service.updateMemberRole(id, body.role, body.actorEmail);
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────────

  @Get('audit-logs')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get audit logs for organization' })
  getAuditLogs(
    @Query('organizationId') organizationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAuditLogs(organizationId, limit ? parseInt(limit) : 50);
  }

  @Get('audit-logs/export')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Export audit logs in CSV or JSON format for SOC2/ISO27001 compliance' })
  async exportAuditLogs(
    @Query('organizationId') organizationId: string,
    @Query('format') format: 'csv' | 'json',
    @Res() res: Response,
  ) {
    const logs = await this.service.getAuditLogs(organizationId, 1000);

    if (format === 'csv') {
      const headers = ['ID', 'User ID', 'User Email', 'Action', 'Resource', 'Resource ID', 'Details', 'Created At'];
      const rows = logs.map(log => [
        log.id,
        log.userId,
        log.userEmail,
        log.action,
        log.resource,
        log.resourceId,
        (log.details || '').replace(/"/g, '""'), // escape quotes
        new Date(log.createdAt).toISOString()
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${organizationId}-${Date.now()}.csv`);
      return res.status(200).send(csvContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${organizationId}-${Date.now()}.json`);
      return res.status(200).send(JSON.stringify(logs, null, 2));
    }
  }

  // ─── Approval Requests ────────────────────────────────────────────────────────

  @Get('approval-requests')
  @Roles('viewer', 'developer', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List pending approval requests' })
  getApprovalRequests(@Query('organizationId') organizationId: string) {
    return this.service.getApprovalRequests(organizationId);
  }

  @Post('approval-requests')
  @Roles('developer', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create approval request for high-risk pipeline' })
  createApprovalRequest(
    @Body() body: { pipelineRunId: string; projectId: string; organizationId: string; requestedBy: string },
  ) {
    return this.service.createApprovalRequest(body);
  }

  @Post('approval-requests/:id/approve')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Approve a pipeline deployment request' })
  approveRequest(
    @Param('id') id: string,
    @Body() body: { reviewerEmail?: string; reason?: string },
  ) {
    return this.service.approveRequest(id, body.reviewerEmail ?? 'admin', body.reason);
  }

  @Post('approval-requests/:id/reject')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Reject a pipeline deployment request' })
  rejectRequest(
    @Param('id') id: string,
    @Body() body: { reviewerEmail?: string; reason: string },
  ) {
    return this.service.rejectRequest(id, body.reviewerEmail ?? 'admin', body.reason);
  }
}
