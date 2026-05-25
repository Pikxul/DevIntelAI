import { Controller, Get, Put, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GovernanceService } from './governance.service';

@ApiTags('governance')
@ApiBearerAuth()
@Controller('governance')
export class GovernanceController {
  constructor(private readonly service: GovernanceService) {}

  // ─── Members ─────────────────────────────────────────────────────────────────

  @Get('members')
  @ApiOperation({ summary: 'List organization members' })
  getMembers(@Query('organizationId') organizationId: string) {
    return this.service.getMembers(organizationId);
  }

  @Put('members/:id/role')
  @ApiOperation({ summary: 'Update member role' })
  updateRole(
    @Param('id') id: string,
    @Body() body: { role: string; actorEmail?: string },
  ) {
    return this.service.updateMemberRole(id, body.role, body.actorEmail);
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs for organization' })
  getAuditLogs(
    @Query('organizationId') organizationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAuditLogs(organizationId, limit ? parseInt(limit) : 50);
  }

  // ─── Approval Requests ────────────────────────────────────────────────────────

  @Get('approval-requests')
  @ApiOperation({ summary: 'List pending approval requests' })
  getApprovalRequests(@Query('organizationId') organizationId: string) {
    return this.service.getApprovalRequests(organizationId);
  }

  @Post('approval-requests')
  @ApiOperation({ summary: 'Create approval request for high-risk pipeline' })
  createApprovalRequest(
    @Body() body: { pipelineRunId: string; projectId: string; organizationId: string; requestedBy: string },
  ) {
    return this.service.createApprovalRequest(body);
  }

  @Post('approval-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a pipeline deployment request' })
  approveRequest(
    @Param('id') id: string,
    @Body() body: { reviewerEmail?: string; reason?: string },
  ) {
    return this.service.approveRequest(id, body.reviewerEmail ?? 'admin', body.reason);
  }

  @Post('approval-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a pipeline deployment request' })
  rejectRequest(
    @Param('id') id: string,
    @Body() body: { reviewerEmail?: string; reason: string },
  ) {
    return this.service.rejectRequest(id, body.reviewerEmail ?? 'admin', body.reason);
  }
}
