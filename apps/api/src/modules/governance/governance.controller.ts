import { Controller, Get, Put, Post, Body, Param, Query, UseGuards, Res, Request } from '@nestjs/common';
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
  getMembers(@Request() req: any) {
    return this.service.getMembers(req.user.organizationId);
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
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAuditLogs(req.user.organizationId, limit ? parseInt(limit) : 50);
  }

  @Get('audit-logs/export')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Export audit logs in CSV or JSON format for SOC2/ISO27001 compliance' })
  async exportAuditLogs(
    @Request() req: any,
    @Query('format') format: 'csv' | 'json',
    @Res() res: Response,
  ) {
    const organizationId = req.user.organizationId;
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
  getApprovalRequests(@Request() req: any) {
    return this.service.getApprovalRequests(req.user.organizationId);
  }

  @Post('approval-requests')
  @Roles('developer', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create approval request for high-risk pipeline' })
  createApprovalRequest(
    @Body() body: { pipelineRunId: string; projectId: string; requestedBy: string },
    @Request() req: any,
  ) {
    return this.service.createApprovalRequest({
      ...body,
      organizationId: req.user.organizationId,
    });
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
